-- ============================================================================
-- HuniOne — Security hardening (hasil audit)
--   P0-1. profiles INSERT: role baru hanya boleh 'pembeli' + check constraint
--   P1-1. profiles UPDATE: user biasa tidak bisa set role sendiri (agent/dll)
--   P1-2. properties UPDATE: seller tidak bisa ubah status (bypass moderasi)
--   P0-2. property_ai_analysis: tulis cache hanya via RPC (service_role)
--   P1-3. profiles SELECT: email privat; publik hanya id/first_name/role
--   RPC  : get_my_profile / get_admin_users (security definer)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P0-1 + P1-1. Kunci role di kolom profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_role_check;

-- Normalisasi role yang tidak dikenal (sisa nilai lama) menjadi 'pembeli',
-- supaya constraint di bawah tidak gagal karena data lama.
update public.profiles
  set role = 'pembeli'
  where role is null
     or role not in ('pembeli', 'owner', 'agent', 'developer', 'admin');

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pembeli', 'owner', 'agent', 'developer', 'admin'));

-- INSERT: akun baru (yang belum punya baris profil) hanya boleh dibuat sbg 'pembeli'.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'pembeli');

-- UPDATE: user biasa boleh mengubah profil sendiri, TAPI role tidak boleh berubah
-- (mencegah self-promote ke agent/developer/admin; admin via policy "Admins can update all profiles".)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and new.role is not distinct from old.role
  );

-- ----------------------------------------------------------------------------
-- P1-2. Seller tidak boleh mengubah status properti sendiri.
-- Seller hanya boleh mengupdate data, dan status harus tetap sama dengan lama.
-- (Transisi pending -> verified/in_review/rejected hanya oleh admin.)
-- ----------------------------------------------------------------------------
drop policy if exists "Sellers can update own properties" on public.properties;
create policy "Sellers can update own properties"
  on public.properties for update
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id
    and new.status is not distinct from old.status
  );

-- ----------------------------------------------------------------------------
-- P0-2. Cache AI finansial: tulis hanya lewat RPC yang diverifikasi service_role.
-- ----------------------------------------------------------------------------
drop policy if exists "AI analysis cache insertable by all" on public.property_ai_analysis;
drop policy if exists "AI analysis cache updatable by all" on public.property_ai_analysis;

create or replace function public.set_property_ai_analysis(
  p_property_id uuid,
  p_analysis_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Hanya server yang boleh menulis cache analisis.';
  end if;

  if p_property_id is null or p_analysis_data is null then
    raise exception 'Argument tidak valid.';
  end if;

  insert into public.property_ai_analysis (property_id, analysis_data, created_at)
  values (p_property_id, p_analysis_data, now())
  on conflict (property_id) do update set
    analysis_data = excluded.analysis_data,
    created_at = excluded.created_at;
end;
$$;

revoke execute on function public.set_property_ai_analysis(uuid, jsonb) from public;
grant execute on function public.set_property_ai_analysis(uuid, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- P1-3. Email & WhatsApp privat: publik hanya membaca id/first_name/role.
-- ----------------------------------------------------------------------------
revoke select on public.profiles from public, anon, authenticated;

grant select (id, first_name, role) on public.profiles to anon, authenticated;

-- RPC pembacaan kolom privat milik sendiri (owner-only, security definer).
create or replace function public.get_my_profile()
returns table (email text, whatsapp text)
language sql
security definer
set search_path = public
as $$
  select p.email, p.whatsapp
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

-- RPC daftar user untuk admin (email & whatsapp sensitif).
create or replace function public.get_admin_users()
returns table (
  id uuid,
  email text,
  whatsapp text,
  first_name text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.email, p.whatsapp, p.first_name, p.role, p.created_at
  from public.profiles p
  where exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  order by p.created_at desc nulls last;
$$;

revoke execute on function public.get_admin_users() from public;
grant execute on function public.get_admin_users() to authenticated;
