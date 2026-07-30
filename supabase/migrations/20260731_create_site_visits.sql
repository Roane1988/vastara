create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  buyer_id uuid references profiles(id) not null,
  scheduled_date date not null,
  scheduled_time time not null,
  notes text default '',
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz default now()
);

alter table site_visits enable row level security;

do $$ begin
  create policy "Users can view their own visits"
    on site_visits for select
    using (auth.uid() = buyer_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can create visits"
    on site_visits for insert
    with check (auth.uid() = buyer_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can cancel their own visits"
    on site_visits for update
    using (auth.uid() = buyer_id)
    with check (auth.uid() = buyer_id and status in ('cancelled'));
exception when duplicate_object then null;
end $$;
