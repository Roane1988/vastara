create table if not exists public.property_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  analysis_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_ai_analysis_created_at_idx
  on public.property_ai_analysis (created_at);

alter table public.property_ai_analysis enable row level security;

do $$ begin
  create policy "AI analysis cache readable by all"
    on public.property_ai_analysis for select
    using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "AI analysis cache insertable by all"
    on public.property_ai_analysis for insert
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "AI analysis cache updatable by all"
    on public.property_ai_analysis for update
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;
