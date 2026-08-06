-- ============================================================================
-- HuniOne — Detail properti tambahan untuk form iklan
--   1. land_area_sqm  : luas tanah (area_sqm tetap = luas bangunan)
--   2. furnished      : kondisi isi properti sewa (furnished/semi/unfurnished)
-- ============================================================================

alter table public.properties
  add column if not exists land_area_sqm numeric;

alter table public.properties
  add column if not exists furnished text not null default '';

alter table public.properties
  drop constraint if exists properties_furnished_check;

alter table public.properties
  add constraint properties_furnished_check
  check (furnished in ('', 'furnished', 'semi_furnished', 'unfurnished'));