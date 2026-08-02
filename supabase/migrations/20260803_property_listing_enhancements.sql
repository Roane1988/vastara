alter table properties
  add column if not exists description_en text,
  add column if not exists is_premium boolean not null default false,
  add column if not exists facilities text;

alter table properties
  drop constraint if exists properties_property_type_check;

alter table properties
  add constraint properties_property_type_check
  check (property_type in ('Rumah', 'Apartemen', 'Villa', 'Tanah', 'Kantor', 'Ruko')) not valid;
