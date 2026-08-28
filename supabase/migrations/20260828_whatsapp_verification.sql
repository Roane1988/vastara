-- ============================================================================
-- HuniOne — Mandatory WhatsApp Verification & Persistent Reminder
--   1. Kolom `whatsapp_verified` (bool, default false) di tabel profiles.
--   2. Auto-create profil saat signup (handle_new_user) menyertakan kolom ini —
--      whatsapp_verified = true bila nomor WhatsApp sudah diisi saat daftar,
--      false bila kosong.
--   3. RPC `get_my_profile()` diperluas untuk mengembalikan `whatsapp_verified`
--      (klien perlu tahu status verifikasi untuk menampilkan banner).
--   4. RPC `set_whatsapp_verified()` (security definer, owner-only): menyimpan
--      nomor WhatsApp + menandai terverifikasi. Dipakai banner verifikasi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tambah kolom whatsapp_verified
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists whatsapp_verified boolean not null default false;

comment on column public.profiles.whatsapp_verified is
  'Status verifikasi WhatsApp. Wajib true untuk dapat memasang listing properti.';

-- ----------------------------------------------------------------------------
-- 2. Backfill: user yang sudah punya nomor WhatsApp dianggap terverifikasi
--    (data lama yang sudah lengkap, supaya tidak memaksa verifikasi ulang).
-- ----------------------------------------------------------------------------
update public.profiles
  set whatsapp_verified = true
  where whatsapp_verified = false
    and coalesce(whatsapp, '') <> '';

-- ----------------------------------------------------------------------------
-- 3. Auto-create profil saat signup — ikutkan whatsapp_verified
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_whatsapp text;
begin
  v_whatsapp := coalesce(new.raw_user_meta_data ->> 'whatsapp', '');

  insert into public.profiles (id, first_name, email, whatsapp, role, whatsapp_verified, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.email, ''),
    v_whatsapp,
    'pembeli',
    (v_whatsapp <> ''),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC get_my_profile — kembalikan juga whatsapp_verified
-- ----------------------------------------------------------------------------
create or replace function public.get_my_profile()
returns table (email text, whatsapp text, whatsapp_verified boolean)
language sql
security definer
set search_path = public
as $$
  select p.email, p.whatsapp, p.whatsapp_verified
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. RPC set_whatsapp_verified — simpan nomor + tandai terverifikasi (owner-only)
--    Dipakai banner verifikasi WhatsApp. Normalisasi nomor di sisi klien.
-- ----------------------------------------------------------------------------
create or replace function public.set_whatsapp_verified(
  p_whatsapp text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login.';
  end if;

  if p_whatsapp is null or trim(p_whatsapp) = '' then
    raise exception 'Nomor WhatsApp tidak boleh kosong.';
  end if;

  update public.profiles
    set whatsapp = trim(p_whatsapp),
        whatsapp_verified = true
    where id = auth.uid();

  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
end;
$$;

revoke execute on function public.set_whatsapp_verified(text) from public;
grant execute on function public.set_whatsapp_verified(text) to authenticated;
