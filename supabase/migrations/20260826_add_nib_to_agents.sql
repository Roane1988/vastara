-- =============================================================
-- Add NIB (Nomor Induk Berusaha) to agent_applications & agent_profiles
-- =============================================================

-- 1. Add nib column to agent_applications
alter table public.agent_applications
  add column if not exists nib text default '';

comment on column public.agent_applications.nib is 'Nomor Induk Berusaha — wajib diisi calon agen';

-- 2. Add nib column to agent_profiles
alter table public.agent_profiles
  add column if not exists nib text default '';

comment on column public.agent_profiles.nib is 'Nomor Induk Berusaha dari aplikasi agen';

-- 3. Update handle_agent_approval() to copy nib
create or replace function public.handle_agent_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select id into v_user_id
    from public.profiles
    where (id = new.user_id or email = new.email)
      and role in ('pembeli', 'owner')
      and id not in (select id from public.profiles where role = 'admin')
    order by (id = new.user_id) desc
    limit 1;

    if v_user_id is not null then
      update public.profiles
        set role = 'agent'
        where id = v_user_id;

      insert into public.agent_profiles (user_id, full_name, agency, region, experience, portfolio, whatsapp, nib)
      values (
        v_user_id,
        coalesce(new.full_name, ''),
        coalesce(new.agency, ''),
        coalesce(new.region, ''),
        coalesce(new.experience, ''),
        coalesce(new.portfolio, ''),
        coalesce(new.whatsapp, ''),
        coalesce(new.nib, '')
      )
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        agency    = excluded.agency,
        region    = excluded.region,
        experience = excluded.experience,
        portfolio = excluded.portfolio,
        whatsapp  = excluded.whatsapp,
        nib       = excluded.nib,
        updated_at = now();
    end if;
  end if;
  return new;
end;
$$;
