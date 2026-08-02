-- ============================================================================
-- HuniOne — Storage upload protection (P1-5)
--   Bucket PROPERTIES_IMAGE dibuat manual di dashboard; di sini hanya
--   melengkapi RLS storage.objects agar upload hanya untuk file gambar.
-- ============================================================================

-- Pastikan bucket ada (no-op jika sudah dibuat manual).
insert into storage.buckets (id, name, public)
values ('PROPERTIES_IMAGE', 'PROPERTIES_IMAGE', true)
on conflict (id) do nothing;

-- Upload hanya file gambar oleh user terautentikasi.
-- Ekstensi + MIME di-whitelist; file non-gambar (HTML/SVG/JS) ditolak.
drop policy if exists "Authenticated upload images only" on storage.objects;
create policy "Authenticated upload images only"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'PROPERTIES_IMAGE'
    and auth.role() = 'authenticated'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
    and mimetype in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  );

-- Pengguna hanya bisa menghapus/memperbarui file miliknya sendiri.
drop policy if exists "Users delete own images" on storage.objects;
create policy "Users delete own images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'PROPERTIES_IMAGE' and owner_id = auth.uid());
