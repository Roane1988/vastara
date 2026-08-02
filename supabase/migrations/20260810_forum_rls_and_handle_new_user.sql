-- ============================================================================
-- HuniOne — Forum RLS + auto-create profil saat signup (P2)
--   1. Aktifkan RLS pada forum_posts / forum_replies (dibuat manual di dashboard,
--      jadi tidak ada RLS di migrations) + policy yang cocok dgn penggunaan client.
--   2. Increment views lewat RPC security definer (RLS tidak bisa compare old/new).
--   3. Trigger handle_new_user: buat baris profiles otomatis saat user signup.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS forum_posts
-- ----------------------------------------------------------------------------
alter table public.forum_posts enable row level security;

drop policy if exists "forum_posts_select" on public.forum_posts;
create policy "forum_posts_select"
  on public.forum_posts for select
  using (true);

drop policy if exists "forum_posts_insert" on public.forum_posts;
create policy "forum_posts_insert"
  on public.forum_posts for insert
  with check (auth.uid() = author_id);

-- Update: penulis boleh edit post-nya sendiri; admin boleh semua.
drop policy if exists "forum_posts_update_author" on public.forum_posts;
create policy "forum_posts_update_author"
  on public.forum_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "forum_posts_update_admin" on public.forum_posts;
create policy "forum_posts_update_admin"
  on public.forum_posts for update
  using (auth.uid() in (select id from public.profiles where role = 'admin'))
  with check (auth.uid() in (select id from public.profiles where role = 'admin'));

drop policy if exists "forum_posts_delete_author" on public.forum_posts;
create policy "forum_posts_delete_author"
  on public.forum_posts for delete
  using (auth.uid() = author_id);

drop policy if exists "forum_posts_delete_admin" on public.forum_posts;
create policy "forum_posts_delete_admin"
  on public.forum_posts for delete
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- ----------------------------------------------------------------------------
-- 2. RLS forum_replies
-- ----------------------------------------------------------------------------
alter table public.forum_replies enable row level security;

drop policy if exists "forum_replies_select" on public.forum_replies;
create policy "forum_replies_select"
  on public.forum_replies for select
  using (true);

drop policy if exists "forum_replies_insert" on public.forum_replies;
create policy "forum_replies_insert"
  on public.forum_replies for insert
  with check (auth.uid() = author_id);

drop policy if exists "forum_replies_update_author" on public.forum_replies;
create policy "forum_replies_update_author"
  on public.forum_replies for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "forum_replies_delete_author" on public.forum_replies;
create policy "forum_replies_delete_author"
  on public.forum_replies for delete
  using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- 3. Increment views (siapa pun bisa menambah views, termasuk anonim)
-- ----------------------------------------------------------------------------
create or replace function public.increment_forum_views(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.forum_posts
  set views = coalesce(views, 0) + 1
  where id = p_post_id;
$$;

revoke execute on function public.increment_forum_views(uuid) from public;
grant execute on function public.increment_forum_views(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Trigger auto-create profil saat signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, email, whatsapp, role, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    'pembeli',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
