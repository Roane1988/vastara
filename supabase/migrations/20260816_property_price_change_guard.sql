-- ============================================================================
-- HuniOne — Property Price Change Guard (threshold + approval queue)
-- Tujuan: seller (owner/agenan/developer) boleh ubah harga dalam ambang batas
--   otomatis; perubahan harga di luar ambang masuk antrian persetujuan admin.
-- Desain:
--   1. Kolom baru di properties:
--        price_requested            = harga yang diminta (titik menunggu)
--        price_change_status        = none | pending | approved | rejected
--        price_requested_at         = waktu saat request diajukan
--        price_reviewed_by_id     = admin yang meninjau
--        price_reviewed_at        = waktu review
--   2. Trigger BEFORE INSERT OR UPDATE OF price:
--        - Admin/super admin → boleh ubah/setujui langsung.
--        - Perubahan <= 15% (atau harga lama <= 0) → langsung jadi.
--        - Perubahan > 15% → ditahan: harga lama tetap, harga baru masuk
--          price_requested dengan status 'pending'.
--   3. Aksi audit approve_price_change / reject_price_change ditambahkan.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Kolom di properties
-- ----------------------------------------------------------------------------
alter table public.properties
  add column if not exists price_requested numeric,
  add column if not exists price_change_status text not null default 'none',
  add column if not exists price_requested_at timestamptz,
  add column if not exists price_reviewed_by uuid references public.profiles(id),
  add column if not exists price_reviewed_at timestamptz;

alter table public.properties
  drop constraint if exists properties_price_change_status_check;
alter table public.properties
  add constraint properties_price_change_status_check
  check (price_change_status in ('none', 'pending', 'approved', 'rejected')) not valid;

create index if not exists properties_price_change_status_idx
  on public.properties (price_change_status)
  where price_change_status = 'pending';

-- ----------------------------------------------------------------------------
-- 2. Trigger guard harga
-- ----------------------------------------------------------------------------
create or replace function public.guard_property_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_threshold numeric := 0.15;
begin
  -- Tidak ada perubahan nilai harga → biarkan (mungkin hanya ubah kolom lain).
  if new.price is not distinct from old.price then
    return new;
  end if;

  -- Cek identitas pembuat perubahan.
  select p.role into v_actor_role
  from public.profiles p
  where p.id = auth.uid();
  v_actor_role := coalesce(v_actor_role, '');

  -- Admin / super admin boleh menetapkan harga langsung (overide & approve).
  if v_actor_role = 'admin' then
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  -- Harga lama tidak bernilai (listing baru): izinkan langsung.
  if old.price is null or old.price <= 0 then
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  -- Perubahan dalam ambang (≤ 15%) : langsung jadi.
  if abs(new.price - old.price) <= old.price * v_threshold then
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  -- Di luar ambang: tahan. Harga lama tetap, harga baru dijadikan permintaan.
  new.price_requested := new.price;
  new.price := old.price;
  new.price_change_status := 'pending';
  new.price_requested_at := now();
  new.price_reviewed_by := null;
  new.price_reviewed_at := null;
  return new;
end;
$$;

drop trigger if exists properties_price_change_guard on public.properties;
create trigger properties_price_change_guard
  before insert or update of price on public.properties
  for each row
  execute function public.guard_property_price_change();

-- ----------------------------------------------------------------------------
-- 3. Whitelist audit untuk approve / reject harga
-- ----------------------------------------------------------------------------
alter table public.audit_logs
  drop constraint if exists audit_logs_action_type_check;
alter table public.audit_logs
  add constraint audit_logs_action_type_check
  check (action_type in (
    'verify_property',
    'start_review',
    'reject_property',
    'restore_property',
    'change_role',
    'approve_agent',
    'reject_agent',
    'delete_agent_application',
    'approve_price_change',
    'reject_price_change'
  )) not valid;