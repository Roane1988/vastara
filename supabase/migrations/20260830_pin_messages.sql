-- Pinned messages (user-local pins per conversation)
-- chat_id is the room key `[a,b].sort().join('-')`
create table if not exists public.pinned_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text not null,
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.pinned_messages enable row level security;

create policy "pin: own select"
  on public.pinned_messages for select
  using (auth.uid() = user_id);

create policy "pin: own insert"
  on public.pinned_messages for insert
  with check (auth.uid() = user_id);

create policy "pin: own delete"
  on public.pinned_messages for delete
  using (auth.uid() = user_id);

create index if not exists pinned_messages_chat_idx
  on public.pinned_messages(user_id, chat_id);
