-- ============================================================================
-- HuniOne — Fix: Daftar (signup) gagal jika nomor WhatsApp sudah dipakai
--
-- Masalah:
--   `handle_new_user` (trigger after insert on auth.users) menyisipkan nomor
--   WhatsApp dari user_metadata langsung ke profiles.whatsapp. Karena ada
--   partial UNIQUE index `profiles_whatsapp_unique_idx` (nomor non-empty harus
--   unik), maka jika seseorang mendaftar dengan nomor WhatsApp yang sudah
--   dipakai akun lain, INSERT ke profiles melanggar index → trigger raise →
--   seluruh INSERT ke auth.users dibatalkan → signup GAGAL secara fatal.
--
-- Perbaikan:
--   Jika nomor WhatsApp sudah terpakai, profil tetap dibuat tetapi kolom
--   whatsapp dikosongkan. Keunikan nomor ditangani secara ramah lewat alur
--   verifikasi WhatsApp (RPC set_whatsapp_verified) yang sudah punya pesan
--   jelas "Nomor WhatsApp sudah terdaftar pada akun lain." — bukan dengan
--   memblokir pembuatan akun.
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
  -- Nomor bisa dipasang & diverifikasi belakangan lewat RPC set_whatsapp_verified.
  v_final_whatsapp := '';
  if v_whatsapp <> '' then
    if not exists (
      select 1 from public.profiles p
      where p.whatsapp = v_whatsapp
    ) then
      v_final_whatsapp := v_whatsapp;
    end if;
  end if;

  insert into public.profiles (id, first_name, email, whatsapp, role, whatsapp_verified, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.email, ''),
    v_final_whatsapp,
    'pembeli',
    (v_final_whatsapp <> ''),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
