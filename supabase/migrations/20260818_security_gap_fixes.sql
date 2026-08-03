-- ============================================================================
-- HuniOne — Penutupan celah hasil audit RLS (batch audit 2026-08-18)
-- Hasil audit menemukan 4 celah nyata di atas migrasi yang sudah ada:
--   1. saved_properties: tombol "Simpan" tidak pernah tersimpan ke database.
--      Client memanggil insert({ property_id }) tanpa user_id (src/utils/
--      favorites.js:49), padahal kolom user_id NOT NULL dan RLS mensyaratkan
--      auth.uid() = user_id. Insert selalu gagal -> favorit hilang saat pindah
--      perangkat. Diperbaiki di level DB dengan trigger BEFORE INSERT.
--   2. agent_profiles: policy SELECT hanya is_visible = true, sehingga agent
--      yang mematikan visibilitasnya tidak bisa membaca/memuat profilnya
--      sendiri (AgentProfilePage.jsx:43). Akibatnya form terisi default lalu
--      handleSubmit mencoba INSERT yang bentrok dengan primary key.
--   3. whatsapp_leads: policy INSERT "with check (true)" membuka spam anonim.
--      Diwajibkan login (buyer_id tetap nullable karena lead fire-and-forget
--      dari PropertyDetailPage:612).
--   4. site_visits: seller/agent belum bisa melihat jadwal survei listing-nya
--      (hanya buyer). Ditambahkan policy SELECT untuk seller & admin sebagai
--      persiapan fitur "Jadwal Survei" di sisi seller.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. saved_properties — isi user_id otomatis di level DB
--    BEFORE INSERT trigger berjalan sebelum evaluasi WITH CHECK policy, jadi
--    dengan check (auth.uid() = user_id) tetap terpenuhi. Aman untuk seluruh
--    client tanpa harus mengubah kode aplikasi.
-- ----------------------------------------------------------------------------
create or replace function public.set_saved_property_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  if new.user_id is null then
    raise exception 'Harus login untuk menyimpan properti.';
  end if;
  return new;
end;
$$;

drop trigger if exists saved_properties_set_owner on public.saved_properties;
create trigger saved_properties_set_owner
  before insert on public.saved_properties
  for each row
  execute function public.set_saved_property_owner();

-- ----------------------------------------------------------------------------
-- 2. agent_profiles — agent boleh membaca profilnya sendiri walau disembunyikan
-- ----------------------------------------------------------------------------
drop policy if exists "Anyone can view visible agent profiles" on public.agent_profiles;
create policy "Anyone can view visible agent profiles"
  on public.agent_profiles for select
  using (is_visible = true or user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. whatsapp_leads — wajibkan login untuk membuat lead (cegah spam anonim)
-- ----------------------------------------------------------------------------
drop policy if exists "Anyone can create leads" on public.whatsapp_leads;
create policy "Authenticated users can create leads"
  on public.whatsapp_leads for insert
  with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 4. site_visits — seller & admin dapat melihat jadwal survei
-- ----------------------------------------------------------------------------
do $$ begin
  create policy "Sellers can view visits for own properties"
    on public.site_visits for select
    using (exists (
      select 1 from public.properties p
      where p.id = site_visits.property_id and p.seller_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admins can view all visits"
    on public.site_visits for select
    using (exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;
