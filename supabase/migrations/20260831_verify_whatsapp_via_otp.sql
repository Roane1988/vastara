-- ============================================================================
-- HuniOne — WhatsApp OTP Verification at Registration
--
-- Tujuan:
--   WhatsApp tidak lagi otomatis terverifikasi hanya karena nomor diisi saat
--   daftar. Sejak fitur OTP diaktifkan, `whatsapp_verified` hanya menjadi true
--   SETELAH pengguna lolos verifikasi kode OTP (MVP dikirim via email;
--   arsitektur siap dialihkan ke WhatsApp melalui edge function).
--
-- Perubahan:
--   1. `handle_new_user` (trigger after insert on auth.users):
--        * `whatsapp_verified` DIKUATKAN menjadi `false` (tidak auto-verify).
--        * Logika anti-bentrok nomor dipertahankan (profil tetap dibuat,
--          whatsapp dikosongkan jika nomor sudah dipakai akun lain).
--   2. RPC `set_whatsapp_verified` dipakai oleh alur verifikasi OTP (klien
--      memanggilnya hanya setelah kode OTP benar).
--
-- Catatan: verifikasi "kepemilikan" nomor untuk MVP dikonfirmasi lewat email
-- yang sama dengan akun (channel email). Saat provider WhatsApp tersedia,
-- cukup alihkan pengiriman kode ke WhatsApp tanpa mengubah RPC ini.
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_whatsapp text;
  v_final_whatsapp text;
begin
  v_whatsapp := coalesce(new.raw_user_meta_data ->> 'whatsapp', '');

  -- Jangan hard-fail signup karena nomor WhatsApp bentrok: jika nomor sudah
  -- dipakai akun lain, biarkan profil terbentuk dengan whatsapp kosong.
  v_final_whatsapp := '';
  if v_whatsapp <> '' then
    if not exists (
      select 1 from public.profiles p
      where p.whatsapp = v_whatsapp
    ) then
      v_final_whatsapp := v_whatsapp;
    end if;
  end if;

  -- whatsapp_verified SELALU false saat daftar. Menjadi true hanya setelah
  -- pengguna lolos verifikasi OTP lewat RPC set_whatsapp_verified.
  insert into public.profiles (id, first_name, email, whatsapp, role, whatsapp_verified, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.email, ''),
    v_final_whatsapp,
    'pembeli',
    false,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
