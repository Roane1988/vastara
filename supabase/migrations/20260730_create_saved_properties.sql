create table if not exists saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  property_id uuid references properties(id) not null,
  created_at timestamptz default now(),
  unique(user_id, property_id)
);

alter table saved_properties enable row level security;

drop policy if exists "saved_properties_select" on saved_properties;
create policy "saved_properties_select" on saved_properties
  for select using (auth.uid() = user_id);

drop policy if exists "saved_properties_insert" on saved_properties;
create policy "saved_properties_insert" on saved_properties
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_properties_delete" on saved_properties;
create policy "saved_properties_delete" on saved_properties
  for delete using (auth.uid() = user_id);
