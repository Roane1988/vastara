-- ============================================================================
-- HuniOne — WhatsApp Verification Hardening (29 Agustus 2026)
--   1. Partial UNIQUE index pada profiles.whatsapp (non-empty) — mencegah satu
--      nomor WhatsApp dipakai banyak akun (mengurangi spam/fraud). Banyak baris
--      NULL/empty tetap diizinkan (user tanpa nomor).
--   2. Perkuat RPC set_whatsapp_verified: validasi + normalisasi di BACKEND
--      (bukan hanya klien yang bisa di-bypass). Hanya digit, 10-14 digit,
--      awalan 08/62/+62 dinormalisasi ke format '62'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Partial UNIQUE index
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_whatsapp_unique_idx
  on public.profiles (whatsapp)
  where whatsapp is not null and whatsapp <> '';

-- ----------------------------------------------------------------------------
-- 2. Perkuat RPC set_whatsapp_verified (validasi + normalisasi backend)
-- ----------------------------------------------------------------------------
create or replace function public.set_whatsapp_verified(
  p_whatsapp text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_digits text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Harus login.';
  end if;

  -- Ambil digit saja, lalu buang karakter non-digit yang tersisa
  v_digits := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');

  if length(v_digits) < 10 or length(v_digits) > 14 then
    raise exception 'Nomor WhatsApp tidak valid (10-14 digit).';
  end if;

  -- Normalisasi awalan: 08... -> 62..., 620... -> 62..., sisanya 62... biarkan
  if v_digits like '0%' then
    v_digits := '62' || substr(v_digits, 2);
  end if;
  if v_digits like '620%' then
    v_digits := '62' || substr(v_digits, 3);
  end if;

  -- Pastikan hanya angka (sudah ter-ensure oleh regexp, jaga-jaga)
  if v_digits !~ '^\d+$' then
    raise exception 'Nomor WhatsApp tidak valid.';
  end if;

  -- Cek duplikasi (selain user sendiri)
  if exists (
    select 1 from public.profiles
    where whatsapp = v_digits and id <> v_uid
  ) then
    raise exception 'Nomor WhatsApp sudah terdaftar pada akun lain.';
  end if;

  update public.profiles
    set whatsapp = v_digits,
        whatsapp_verified = true
    where id = v_uid;

  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
end;
$$;

revoke execute on function public.set_whatsapp_verified(text) from public;
grant execute on function public.set_whatsapp_verified(text) to authenticated;
