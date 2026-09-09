-- ============================================================================
-- HuniOne — Dashboard Analytics & Atribusi Terjual
-- Tujuan:
--   1. `property_views` mencatat tayangan iklan properti (dari halaman detail)
--      untuk metrik performa di Dashboard Penjual/Agen.
--   2. Kolom atribusi `sold_*` pada `properties` untuk menyimpan sumber
--      pembeli saat penjual menandai properti sebagai terjual (Internal vs
--      Eksternal) melalui modal konfirmasi di Dashboard.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabel property_views (tayangan properti)
--    record[:1] unik per (property_id, viewer_id, hari) agar tiap user hanya
--    menghitung 1 tayangan per hari per properti.
-- ----------------------------------------------------------------------------
create table if not exists public.property_views (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (property_id, viewer_id, viewed_on)
);

create index if not exists property_views_property_idx
  on public.property_views (property_id, viewed_on desc);

alter table public.property_views enable row level security;

-- Siapa pun yang login boleh mencatat tayangan.
drop policy if exists "Users can record property views" on public.property_views;
create policy "Users can record property views"
  on public.property_views for insert
  with check (true);

-- Seller dapat melihat tayangan propertinya sendiri.
drop policy if exists "Sellers can view own property views" on public.property_views;
create policy "Sellers can view own property views"
  on public.property_views for select
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and p.seller_id = auth.uid()
  ));

-- Admin dapat melihat semua tayangan.
drop policy if exists "Admins can view all property views" on public.property_views;
create policy "Admins can view all property views"
  on public.property_views for select
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- ----------------------------------------------------------------------------
-- 2. Kolom atribusi terjual pada properties
--    - sold_source : 'internal' | 'external'  (prospek platform / luar platform)
--    - sold_buyer_id : user platform yang jadi pembeli (jika internal)
--    - sold_at : waktu properti ditandai terjual
--    (Policy "Sellers can update own properties" sudah ada di migration
--     20260813_fix_rls_recursion.sql, tidak perlu dibuat ulang.)
-- ----------------------------------------------------------------------------
alter table public.properties
  add column if not exists sold_source text,
  add column if not exists sold_buyer_id uuid references public.profiles(id),
  add column if not exists sold_at timestamptz;
