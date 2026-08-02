-- ============================================================================
-- HuniOne — Agent Directory & Performance
-- Komponen:
--   1. agent_profiles  — data publik agent (1:1 ke profiles) untuk direktori
--   2. agent_reviews   — rating buyer → agent (1-5) untuk skor performa
--   3. agent_stats     — view performa: listing + premium (metrik Top Agent)
--   4. handle_agent_approval() — saat approve, isi agent_profiles dari aplikasi
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. agent_profiles
-- ----------------------------------------------------------------------------
create table if not exists public.agent_profiles (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  full_name        text not null,
  agency           text default '',
  region           text default '',
  experience       text default '',
  experience_years int default 0,
  portfolio        text default '',
  bio              text default '',
  whatsapp         text default '',
  is_visible       boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists agent_profiles_region_idx
  on public.agent_profiles (region);

alter table public.agent_profiles enable row level security;

-- Anyone (including anonymous visitors) can browse the agent directory.
do $$ begin
  create policy "Anyone can view visible agent profiles"
    on public.agent_profiles for select
    using (is_visible = true);
exception when duplicate_object then null;
end $$;

-- Agents can maintain their own directory profile.
do $$ begin
  create policy "Agents can insert own profile"
    on public.agent_profiles for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Agents can update own profile"
    on public.agent_profiles for update
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Admins manage everything (toggle visibility, fix data).
do $$ begin
  create policy "Admins manage agent profiles"
    on public.agent_profiles for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 2. agent_reviews
-- ----------------------------------------------------------------------------
create table if not exists public.agent_reviews (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references public.profiles(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  rating      smallint not null check (rating between 1 and 5),
  comment     text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (agent_id, reviewer_id)
);

create index if not exists agent_reviews_agent_id_idx
  on public.agent_reviews (agent_id);

alter table public.agent_reviews enable row level security;

-- Ratings are public (aggregate performance shown in directory).
do $$ begin
  create policy "Anyone can view agent reviews"
    on public.agent_reviews for select
    using (true);
exception when duplicate_object then null;
end $$;

-- Logged-in buyers can review an agent once.
do $$ begin
  create policy "Authenticated users can review agents"
    on public.agent_reviews for insert
    with check (auth.uid() = reviewer_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Reviewers can update own review"
    on public.agent_reviews for update
    using (auth.uid() = reviewer_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Reviewers can delete own review"
    on public.agent_reviews for delete
    using (auth.uid() = reviewer_id);
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. agent_stats — view performa (listing + premium sebagai metrik Top Agent)
-- ----------------------------------------------------------------------------
-- Kolom is_premium berasal dari migration property_listing_enhancements.
-- Guard ini membuat migration tetap jalan walau migration tsb belum dijalankan.
alter table public.properties
  add column if not exists is_premium boolean not null default false;

create or replace view public.agent_stats as
select
  p.id as agent_id,
  p.first_name,
  ap.region,
  ap.experience_years,
  count(distinct prop.id) filter (where prop.status = 'verified')                       as verified_listings,
  count(distinct prop.id) filter (where prop.status = 'verified' and prop.is_premium)   as premium_listings,
  (count(distinct prop.id) filter (where prop.status = 'verified'))
    + (count(distinct prop.id) filter (where prop.status = 'verified' and prop.is_premium)) as listing_score,
  count(distinct sv.id)                                   as total_visits,
  count(distinct sv.id) filter (where sv.status = 'completed') as completed_visits,
  coalesce(avg(ar.rating) filter (where ar.rating is not null), 0)::numeric(3, 2)       as avg_rating,
  count(distinct ar.id)                                    as review_count
from public.profiles p
left join public.agent_profiles ap on ap.user_id = p.id
left join public.properties prop on prop.seller_id = p.id
left join public.site_visits sv on sv.property_id = prop.id
left join public.agent_reviews ar on ar.agent_id = p.id
where p.role = 'agent'
group by p.id, p.first_name, ap.region, ap.experience_years;

grant select on public.agent_stats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Approval trigger: promote role + copy application data to agent_profiles
-- ----------------------------------------------------------------------------
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
    -- cari profile tujuan: utamakan user_id, fallback email
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

      insert into public.agent_profiles (user_id, full_name, agency, region, experience, portfolio, whatsapp)
      values (
        v_user_id,
        coalesce(new.full_name, ''),
        coalesce(new.agency, ''),
        coalesce(new.region, ''),
        coalesce(new.experience, ''),
        coalesce(new.portfolio, ''),
        coalesce(new.whatsapp, '')
      )
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        agency    = excluded.agency,
        region    = excluded.region,
        experience = excluded.experience,
        portfolio = excluded.portfolio,
        whatsapp  = excluded.whatsapp,
        updated_at = now();
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

-- ----------------------------------------------------------------------------
-- 5. Backfill: agent yang sudah approved sebelum migration ini
-- ----------------------------------------------------------------------------
insert into public.agent_profiles (user_id, full_name, agency, region, experience, portfolio, whatsapp)
select
  p.id,
  a.full_name,
  a.agency,
  a.region,
  a.experience,
  a.portfolio,
  a.whatsapp
from public.agent_applications a
join public.profiles p on p.id = a.user_id or p.email = a.email
where a.status = 'approved'
  and p.role = 'agent'
on conflict (user_id) do nothing;
