-- 20260820_property_published_at.sql
-- Definisi "properti baru" = saat properti pertama kali tayang publik
-- (status berubah menjadi 'verified'), bukan saat seller mulai menulis draft.
--
--   1. Tambah kolom published_at
--   2. Backfill properti yang sudah verified memakai created_at (perkiraan)
--   3. Trigger: isi published_at otomatis saat status -> 'verified'

alter table public.properties
  add column if not exists published_at timestamptz;

update public.properties
  set published_at = created_at
  where published_at is null
    and status = 'verified';

create or replace function public.set_property_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'verified' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_properties_set_published_at on public.properties;
create trigger trg_properties_set_published_at
  before insert or update of status on public.properties
  for each row execute function public.set_property_published_at();