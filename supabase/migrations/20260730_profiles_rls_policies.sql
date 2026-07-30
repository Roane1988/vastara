alter table profiles enable row level security;

-- SELECT: anyone can see profiles (needed for property detail, chat, etc.)
drop policy if exists "Anyone can view profiles" on profiles;
create policy "Anyone can view profiles"
  on profiles for select
  using (true);

-- INSERT: authenticated users can insert their own profile row
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- UPDATE for regular users: can update own profile, but CANNOT set role to 'admin'
-- If already an admin, the second policy lets them update regardless.
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      role is distinct from 'admin'
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    )
  );

-- UPDATE for admins: can update any profile (full access, including role changes)
drop policy if exists "Admins can update all profiles" on profiles;
create policy "Admins can update all profiles"
  on profiles for update
  using (auth.uid() in (select id from profiles where role = 'admin'))
  with check (true);

-- DELETE: only admins can delete profiles
drop policy if exists "Admins can delete profiles" on profiles;
create policy "Admins can delete profiles"
  on profiles for delete
  using (auth.uid() in (select id from profiles where role = 'admin'));
