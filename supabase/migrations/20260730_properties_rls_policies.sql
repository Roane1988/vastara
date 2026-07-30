alter table properties enable row level security;

drop policy if exists "Anyone can view verified properties" on properties;
create policy "Anyone can view verified properties"
  on properties for select
  using (status = 'verified');

drop policy if exists "Sellers can view own properties" on properties;
create policy "Sellers can view own properties"
  on properties for select
  using (auth.uid() = seller_id);

drop policy if exists "Admins can view all properties" on properties;
create policy "Admins can view all properties"
  on properties for select
  using (auth.uid() in (select id from profiles where role = 'admin'));

drop policy if exists "Sellers can insert own properties" on properties;
create policy "Sellers can insert own properties"
  on properties for insert
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update own properties" on properties;
create policy "Sellers can update own properties"
  on properties for update
  using (auth.uid() = seller_id);

drop policy if exists "Admins can update all properties" on properties;
create policy "Admins can update all properties"
  on properties for update
  using (auth.uid() in (select id from profiles where role = 'admin'));

drop policy if exists "Sellers can delete own properties" on properties;
create policy "Sellers can delete own properties"
  on properties for delete
  using (auth.uid() = seller_id);

drop policy if exists "Admins can delete all properties" on properties;
create policy "Admins can delete all properties"
  on properties for delete
  using (auth.uid() in (select id from profiles where role = 'admin'));
