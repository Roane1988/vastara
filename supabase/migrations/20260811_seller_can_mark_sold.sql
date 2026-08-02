-- ============================================================================
-- HuniOne — Izinkan seller menandai properti 'sold'
--   Melonggarkan policy 20260808 (P1-2) tanpa membuka bypass moderasi:
--     - Seller tetap TIDAK bisa mengubah status ke verified/in_review/rejected.
--     - Seller BOLEH mengubah status hanya dari 'verified' -> 'sold'
--       (fitur "Tandai Terjual" di halaman Iklan Saya).
--     - Update field lain (tanpa mengubah status) tetap diizinkan untuk semua status.
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
      -- Khusus: seller hanya boleh menandai properti yang sudah verified sebagai sold.
      or (
        status = 'sold'
        and (select pr.status from public.properties pr where pr.id = id) = 'verified'
      )
    )
  );
