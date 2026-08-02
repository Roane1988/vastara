-- ============================================================================
-- HuniOne — Integrity fixes (hasil audit)
--   A1. agent_profiles INSERT: hanya role 'agent' yang boleh self-insert
--   A2. agent_stats: hanya hitung listing seller_type='agent' (bukan owner)
--   A3. enforce_property_seller_type: hanya validasi saat kolom relevan berubah
--       (update status/verifikasi oleh admin tidak boleh terblokir)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A1. agent_profiles: cek role 'agent' pada insert policy
-- ----------------------------------------------------------------------------
drop policy if exists "Agents can insert own profile" on public.agent_profiles;

create policy "Agents can insert own profile"
  on public.agent_profiles for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'agent'
    )
  );

-- ----------------------------------------------------------------------------
-- A2. agent_stats: hanya listing yang dipasang sebagai 'agent' yang dihitung
-- ----------------------------------------------------------------------------
drop view if exists public.agent_stats;

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
left join public.properties prop on prop.seller_id = p.id and prop.seller_type = 'agent'
left join public.site_visits sv on sv.property_id = prop.id and prop.status = 'verified'
left join public.agent_reviews ar on ar.agent_id = p.id
where p.role = 'agent'
group by p.id, p.first_name, ap.region, ap.experience_years;

grant select on public.agent_stats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- A3. enforce_property_seller_type: jangan validasi saat tidak ada perubahan
--     seller_type/seller_id (mis. admin hanya mengubah status properti).
-- ----------------------------------------------------------------------------
create or replace function public.enforce_property_seller_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.seller_id is null then
    return new;
  end if;

  -- Update status/verifikasi atau edit tanpa mengubah penjual tidak
  -- perlu divalidasi ulang; admin tetap bisa memoderasi properti milik
  -- akun yang rolenya turun tanpa properti "terkunci".
  if tg_op = 'UPDATE'
     and old.seller_type is not distinct from new.seller_type
     and old.seller_id is not distinct from new.seller_id then
    return new;
  end if;

  select role into v_role
  from public.profiles
  where id = new.seller_id;

  if new.seller_type = 'agent' and v_role is distinct from 'agent' then
    raise exception 'Hanya agen terverifikasi yang dapat memasang iklan sebagai agen.';
  end if;

  if new.seller_type = 'developer' and v_role is distinct from 'developer' then
    raise exception 'Hanya pengembang yang dapat memasang iklan sebagai pengembang.';
  end if;

  return new;
end;
$$;

drop trigger if exists properties_seller_type_trg on public.properties;
create trigger properties_seller_type_trg
  before insert or update on public.properties
  for each row
  execute function public.enforce_property_seller_type();
