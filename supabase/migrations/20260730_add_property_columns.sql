alter table properties
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists certificate_status text;
