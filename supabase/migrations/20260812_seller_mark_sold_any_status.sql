-- ============================================================================
-- HuniOne — Seller boleh menandai 'sold' dari status apa pun
--   Migration 20260811 hanya mengizinkan verified -> sold, padahal tombol
--   "Tandai Terjual" di Iklan Saya juga tampil untuk properti pending/in_review,
--   sehingga update ditolak RLS. Di sini dilonggarkan:
--     - Seller tetap TIDAK bisa mengubah status ke verified/in_review/rejected.
--     - Seller BOLEH set status 'sold' dari status apa pun miliknya
--       (menandai sold = menurunkan iklan, bukan bypass moderasi).
--     - Update field lain (tanpa mengubah status) tetap diizinkan.
-- ============================================================================

drop policy if exists "Sellers can update own properties" on public.properties;
create policy "Sellers can update own properties"
  on public.properties for update
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id
    and (
      -- Update data biasa: status tidak berubah.
      status is not distinct from (select pr.status from public.properties pr where pr.id = id)
      -- Seller boleh menurunkan iklan dengan menandai sold.
      or status = 'sold'
    )
  );
