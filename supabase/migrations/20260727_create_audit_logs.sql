create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) not null,
  admin_name text,
  action_type text not null,
  target_type text not null,
  target_id text,
  target_detail jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table audit_logs enable row level security;

create policy "Admins can read audit_logs"
  on audit_logs for select
  using (auth.uid() in (select id from profiles where role = 'admin'));

create policy "Authenticated can insert audit_logs"
  on audit_logs for insert
  with check (auth.role() = 'authenticated');
