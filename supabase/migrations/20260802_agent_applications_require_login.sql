-- ============================================================================
-- Vastara — Agent Applications: require login
-- Option B: applicants must be logged in.
-- Adds user_id, tightens RLS to only allow the owner to submit, and lets the
-- approval trigger match the profile by user_id (fallback to email).
-- ============================================================================

-- 1. Link each application to an authenticated user.
alter table public.agent_applications
  add column if not exists user_id uuid references auth.users(id);

create index if not exists agent_applications_user_id_idx
  on public.agent_applications (user_id);

-- 2. Replace the open insert policy with one that requires a logged-in user
--    submitting for themselves.
drop policy if exists "Anyone can submit agent applications"
  on public.agent_applications;

do $$ begin
  create policy "Users can submit their own agent applications"
    on public.agent_applications for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- 3. Allow applicants to see their own application status (admins keep full view).
do $$ begin
  create policy "Users can view their own agent applications"
    on public.agent_applications for select
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- 4. On approval, promote the linked profile (by user_id) or fall back to email.
create or replace function public.handle_agent_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.user_id is not null then
      update public.profiles
        set role = 'agent'
        where id = new.user_id
          and role in ('pembeli', 'owner')
          and id not in (select id from public.profiles where role = 'admin');
      if not found then
        update public.profiles
          set role = 'agent'
          where email = new.email
            and role in ('pembeli', 'owner')
            and id not in (select id from public.profiles where role = 'admin');
      end if;
    else
      update public.profiles
        set role = 'agent'
        where email = new.email
          and role in ('pembeli', 'owner')
          and id not in (select id from public.profiles where role = 'admin');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists agent_approval_trigger on public.agent_applications;
create trigger agent_approval_trigger
  after update of status on public.agent_applications
  for each row
  execute function public.handle_agent_approval();
