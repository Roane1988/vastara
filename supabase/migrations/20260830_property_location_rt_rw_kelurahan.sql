-- ============================================================================
-- HuniOne — Field lokasi detail: RT, RW, dan Kelurahan pada properti
-- ============================================================================

alter table public.properties
  add column if not exists rt text,
  add column if not exists rw text,
  add column if not exists kelurahan text;
