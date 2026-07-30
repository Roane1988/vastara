create table if not exists forum_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  target_id uuid not null,
  target_type text not null check (target_type in ('post', 'reply')),
  created_at timestamptz default now(),
  unique(user_id, target_id, target_type)
);

alter table forum_likes enable row level security;

drop policy if exists "forum_likes_select" on forum_likes;
create policy "forum_likes_select" on forum_likes
  for select using (true);

drop policy if exists "forum_likes_insert" on forum_likes;
create policy "forum_likes_insert" on forum_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "forum_likes_delete" on forum_likes;
create policy "forum_likes_delete" on forum_likes
  for delete using (auth.uid() = user_id);
