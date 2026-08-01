-- ============================================================================
-- Vastara — Agent Applications
-- Public registration form for people outside HuniOne who want to become an agent.
-- Flow: pending -> (admin approve) -> approved + role updated to 'agent'
--        pending -> (admin reject) -> rejected (with reason)
-- ============================================================================

create table if not exists public.agent_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  whatsapp text not null,
  agency text default '',
  experience text default '',
  region text default '',
  portfolio text default '',
  agreement_accepted_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_applications_status_idx
  on public.agent_applications (status);
create index if not exists agent_applications_created_at_idx
  on public.agent_applications (created_at);

alter table public.agent_applications enable row level security;

-- Anyone (including anonymous visitors) can submit an application.
do $$ begin
  create policy "Anyone can submit agent applications"
    on public.agent_applications for insert
    with check (true);
exception when duplicate_object then null;
end $$;

-- Only admins can view the applications.
do $$ begin
  create policy "Admins can view agent applications"
    on public.agent_applications for select
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
exception when duplicate_object then null;
end $$;

-- Only admins can update (approve / reject) applications.
do $$ begin
  create policy "Admins can update agent applications"
    on public.agent_applications for update
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- Optional: on approval, automatically promote the matching user (if any) to 'agent'.
-- Trigger reads the application email and updates the linked profile role.
-- ============================================================================
create or replace function public.handle_agent_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles
      set role = 'agent'
      where email = new.email
        and role in ('pembeli', 'owner')
        and id not in (select id from public.profiles where role = 'admin');
  end if;
  return new;
end;
$$;

drop trigger if exists agent_approval_trigger on public.agent_applications;
create trigger agent_approval_trigger
  after update of status on public.agent_applications
  for each row
  execute function public.handle_agent_approval();
