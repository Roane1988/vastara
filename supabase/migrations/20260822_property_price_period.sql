-- ============================================================================
-- HuniOne — Periode harga properti (price_period)
-- Memisahkan harga properti Dijual (total) vs Disewa (per bulan / per tahun).
-- Kolom baru: price_periods ('total' | 'bulan' | 'tahun').
-- Backfill: listing Disewa yang sudah ada tanpa periode dianggap 'bulan'
-- (konsisten dengan tampilan lama "/bulan").
-- ============================================================================

alter table public.properties
  add column if not exists price_period text not null default 'total';

alter table public.properties
  drop constraint if exists properties_price_period_check;

alter table public.properties
  add constraint properties_price_period_check
  check (price_period in ('total', 'bulan', 'tahun'));

update public.properties
  set price_period = 'bulan'
  where category = 'Disewa'
    and (price_period is null or price_period = 'total');

create index if not exists properties_price_period_idx
  on public.properties (price_period);