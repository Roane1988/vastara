create table if not exists public.user_financial_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_income numeric not null default 0,
  monthly_commitments numeric not null default 0,
  monthly_budget numeric not null default 0,
  purchase_goal text default 'rumah_pertama' check (
    purchase_goal in ('rumah_pertama', 'huni', 'investasi', 'sewa', 'belum_tahu')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create index if not exists user_financial_profiles_user_id_idx
  on public.user_financial_profiles (user_id);

alter table public.user_financial_profiles enable row level security;

do $$ begin
  create policy "Users can view own financial profile"
    on public.user_financial_profiles for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own financial profile"
    on public.user_financial_profiles for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own financial profile"
    on public.user_financial_profiles for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
