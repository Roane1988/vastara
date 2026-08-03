-- ============================================================================
-- HuniOne — Histori Harga & baseline "original_price" untuk fitur Turun Harga
-- Tujuan:
--   1. Tambah kolom properties.original_price = harga tertinggi yang pernah
--      tercatat (baseline untuk menghitung % penurunan).
--   2. Buat tabel price_history mencatat tiap perubahan harga yang benar-benar
--      diterapkan (dari seller dalam ambang, atau dari admin approve), agar
--      halaman /price-drop bisa menampilkan properti yang baru turun.
--   3. Update trigger guard_property_price_change untuk memelihara
--      original_price + merekam ke price_history.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. original_price di properties
-- ----------------------------------------------------------------------------
alter table public.properties
  add column if not exists original_price numeric;

-- Backfill: properti yang ada → baseline = harga saat ini.
update public.properties
  set original_price = price
  where original_price is null and price is not null and price > 0;

-- ----------------------------------------------------------------------------
-- 2. Tabel price_history
-- ----------------------------------------------------------------------------
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  old_price numeric,
  new_price numeric not null,
  price_pct numeric,
  source text default 'app',          -- seller (dalam ambang) | admin (approve/override)
  applied_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.price_history enable row level security;

create index if not exists price_history_property_idx
  on public.price_history (property_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. Fungsi perekam riwayat harga (dipanggil dari trigger)
-- ----------------------------------------------------------------------------
create or replace function public.log_price_change(
  p_property_id uuid,
  p_old_price numeric,
  p_new_price numeric,
  p_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.price_history (property_id, old_price, new_price, price_pct, source, applied_by)
  values (
    p_property_id,
    p_old_price,
    p_new_price,
    case when p_old_price is not null and p_old_price > 0
         then round(((p_new_price - p_old_price) / p_old_price * 100)::numeric, 2)
         else null end,
    coalesce(p_source, 'applied'),
    auth.uid()
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Update guard: kelola original_price + rekam riwayat
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
  v_base numeric;
begin
  -- Tidak ada perubahan nilai harga → biarkan.
  if new.price is not distinct from old.price then
    return new;
  end if;

  -- Listing baru / harga lama kosong: harga pertama jadi baseline.
  if tg_op = 'INSERT' or old.price is null or old.price <= 0 then
    new.original_price := coalesce(new.original_price, new.price);
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  select p.role into v_actor_role
  from public.profiles p
  where p.id = auth.uid();
  v_actor_role := coalesce(v_actor_role, '');

  v_base := coalesce(old.original_price, old.price);

  -- Admin / super admin: langsung terapkan + catat.
  if v_actor_role = 'admin' then
    perform public.log_price_change(new.id, old.price, new.price, 'admin');
    new.original_price := case when new.price > v_base then new.price else v_base end;
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  -- Dalam ambang (≤ 15%): langsung jadi + catat.
  if abs(new.price - old.price) <= old.price * v_threshold then
    perform public.log_price_change(new.id, old.price, new.price, 'seller');
    new.original_price := case when new.price > v_base then new.price else v_base end;
    new.price_change_status := 'none';
    new.price_requested := null;
    return new;
  end if;

  -- Di luar ambang: tahan; harga lama tetap, baru jadi permintaan.
  new.price_requested := new.price;
  new.price := old.price;
  new.price_change_status := 'pending';
  new.price_requested_at := now();
  new.price_reviewed_by := null;
  new.price_reviewed_at := null;
  new.original_price := v_base;
  return new;
end;
$$;

-- Pastikan trigger tetap ada (fungsi diganti, trigger lama menunjuk nama fungsi
-- yang sama dengan efek baru).
drop trigger if exists properties_price_change_guard on public.properties;
create trigger properties_price_change_guard
  before insert or update of price on public.properties
  for each row
  execute function public.guard_property_price_change();