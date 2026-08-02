-- ============================================================================
-- HuniOne — Perbaikan RLS infinite recursion (42P17)
--   Subquery self-referential DI DALAM policy untuk tabel yang RLS-nya aktif
--   memicu "infinite recursion detected in policy for relation X" saat policy
--   dievaluasi (contoh nyata: update properties -> ERROR 42P17).
--   Ini memengaruhi policy 20260808/20260811/20260812 yang membaca nilai lama
--   lewat subquery ke tabel yang sama.
--
--   Solusi:
--     - Policy dibuat sederhana, TANPA subquery ke tabel yang sama.
--     - Validasi transisi (status properties, role profiles) dipindah ke
--       trigger (punya akses OLD/NEW).
--     - Cek "apakah admin" dipindah ke helper security definer is_admin(),
--       sehingga query di dalamnya berjalan tanpa RLS (tidak memicu recursion).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: cek pengguna saat ini admin (security definer -> tanpa RLS).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- properties — policy update sederhana (tanpa subquery self-referential)
-- ----------------------------------------------------------------------------
drop policy if exists "Sellers can update own properties" on public.properties;
drop policy if exists "properties_update" on public.properties;

create policy "Sellers can update own properties"
  on public.properties for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Bersihkan policy admin lama yang masih memakai subquery ke profiles
-- (diganti helper is_admin agar konsisten dan aman dari recursion).
drop policy if exists "Admins can update all properties" on public.properties;
create policy "Admins can update all properties"
  on public.properties for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can update any property" on public.properties;
create policy "Admins can update any property"
  on public.properties for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can view all properties" on public.properties;
create policy "Admins can view all properties"
  on public.properties for select
  using (public.is_admin());

drop policy if exists "Admins can delete all properties" on public.properties;
create policy "Admins can delete all properties"
  on public.properties for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- properties — trigger transisi status (pengganti batasan di policy)
--   Non-admin: hanya boleh verified -> sold (fitur "Tandai Terjual").
--   Admin / service (tanpa identitas) bebas memoderasi.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_property_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Internal/service (tanpa identitas pengguna) bebas memoderasi.
  if auth.uid() is null then
    return new;
  end if;

  -- Status tidak berubah -> biarkan (edit data biasa).
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Admin bebas mengubah status apa pun.
  if public.is_admin() then
    return new;
  end if;

  -- Seller (non-admin): hanya boleh verified -> sold.
  if old.status = 'verified' and new.status = 'sold' then
    return new;
  end if;

  raise exception 'Perubahan status properti tidak diizinkan.';
end;
$$;

drop trigger if exists properties_status_transition_trg on public.properties;
create trigger properties_status_transition_trg
  before update on public.properties
  for each row
  execute function public.enforce_property_status_transition();

-- ----------------------------------------------------------------------------
-- profiles — policy update sederhana (tanpa subquery self-referential)
-- ----------------------------------------------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- profiles — trigger proteksi role (pengganti batasan di policy)
--   Role hanya bisa berubah oleh admin / service; user biasa tidak bisa
--   self-promote ke agent/developer/admin.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'Role tidak dapat diubah.';
end;
$$;

drop trigger if exists profiles_role_change_trg on public.profiles;
create trigger profiles_role_change_trg
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_change();
