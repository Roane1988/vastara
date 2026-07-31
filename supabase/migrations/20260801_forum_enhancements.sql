-- Forum enhancements: views, pinned posts, best answer, tags, polls, multi-emoji reactions
-- Run this in Supabase SQL Editor.

-- 1) forum_posts: new columns
alter table public.forum_posts
  add column if not exists views integer not null default 0,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists solved_reply_id uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists poll jsonb;

-- 2) forum_reactions: multi-emoji reactions (one reaction per user per target)
create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_type text not null check (target_type in ('post', 'reply')),
  reaction text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_id, target_type)
);

alter table public.forum_reactions enable row level security;

create policy "forum_reactions_select" on public.forum_reactions
  for select using (true);

create policy "forum_reactions_insert" on public.forum_reactions
  for insert with check (auth.uid() = user_id);

create policy "forum_reactions_update" on public.forum_reactions
  for update using (auth.uid() = user_id);

create policy "forum_reactions_delete" on public.forum_reactions
  for delete using (auth.uid() = user_id);

-- 3) forum_poll_votes: votes for polls embedded in posts
create table if not exists public.forum_poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.forum_poll_votes enable row level security;

create policy "forum_poll_votes_select" on public.forum_poll_votes
  for select using (true);

create policy "forum_poll_votes_insert" on public.forum_poll_votes
  for insert with check (auth.uid() = user_id);

create policy "forum_poll_votes_update" on public.forum_poll_votes
  for update using (auth.uid() = user_id);

create policy "forum_poll_votes_delete" on public.forum_poll_votes
  for delete using (auth.uid() = user_id);

-- 4) Migrate existing forum_likes into reactions (as 👍) for backward compatibility
insert into public.forum_reactions (user_id, target_id, target_type, reaction)
select l.user_id, l.target_id, l.target_type, '👍'
from public.forum_likes l
on conflict (user_id, target_id, target_type) do nothing;
