-- ============================================================================
-- HuniOne — Alur "Jadwal Survei" di sisi seller
-- Membuka alur: buyer booking -> seller & admin dapat mengubah status
-- (confirmed/cancelled/completed) + realtime agar seller dapat notif instan.
-- ----------------------------------------------------------------------------
-- Catatan RLS. Migrasi sebelumnya (20260818) cuma menambah policy SELECT
-- untuk seller & admin. tanpa UPDATE, seller tidak bisa mengonfirmasi/tolak.
-- Policy buyer lama (20260731) tetap boleh cancel -> 'cancelled'. Policy baru
-- di bawah mengizinkan seller/admin UPDATE untuk properti mereka tanpa
-- mengubah perilaku buyer.
-- ============================================================================

do $$ begin
  create policy "Sellers can update visits for own properties"
    on public.site_visits for update
    using (exists (
      select 1 from public.properties p
      where p.id = site_visits.property_id and p.seller_id = auth.uid()
    ))
    with check (exists (
      select 1 from public.properties p
      where p.id = site_visits.property_id and p.seller_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admins can update all visits"
    on public.site_visits for update
    using (exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ))
    with check (exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Realtime: izinkan channel Notifikasi masuk untuk baris site_visits
-- ----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.site_visits;
exception when duplicate_object then null;
end $$;