-- Starred/bookmarked messages (user-local bookmarks per conversation)
-- chat_id is the room key `[a,b].sort().join('-')`
create table if not exists public.chat_stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text not null,
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.chat_stars enable row level security;

create policy "chat_stars: own select"
  on public.chat_stars for select
  using (auth.uid() = user_id);

create policy "chat_stars: own insert"
  on public.chat_stars for insert
  with check (auth.uid() = user_id);

create policy "chat_stars: own delete"
  on public.chat_stars for delete
  using (auth.uid() = user_id);

create index if not exists chat_stars_chat_idx
  on public.chat_stars(user_id, chat_id);