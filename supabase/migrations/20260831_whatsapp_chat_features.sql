-- ============================================================================
-- HuniOne — Fitur Chat ala WhatsApp (Reaksi, Terakhir Dilihat, Mute)
-- Tujuan:
--   1. `message_reactions`  : emoji reaction per pesan (sinkron realtime).
--   2. `profiles.last_seen_at` : timestamp "terakhir dilihat" untuk contact.
--   3. `user_contact_settings` : pengaturan per-kontak (mute notifikasi).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Reaksi pesan (message_reactions)
--    unique (message_id, user_id, emoji) agar satu user bisa memberi beberapa
--    emoji berbeda pada pesan yang sama, tapi tidak dobel untuk emoji yang sama.
-- ----------------------------------------------------------------------------
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Baca reaksi: hanya user yang terlibat dalam direct_message terkait yang boleh membaca.
create policy "Reactions: read participants"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.direct_messages dm
      where dm.id = message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

-- Tambah reaksi: siapa pun yang login boleh memberi reaksi (pembatas id unik di atas).
create policy "Reactions: insert own"
  on public.message_reactions for insert
  with check (auth.uid() = user_id);

-- Hapus reaksi: hanya pemilik reaksi itu.
create policy "Reactions: delete own"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- Ekspos realtime perubahan reaksi (client filter sisi sendiri).
do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Terakhir dilihat (last_seen_at) pada profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. Pengaturan per-kontak (mute dll.)
-- ----------------------------------------------------------------------------
create table if not exists public.user_contact_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, contact_id)
);

alter table public.user_contact_settings enable row level security;

create policy "Contact settings: own select"
  on public.user_contact_settings for select
  using (auth.uid() = user_id);

create policy "Contact settings: own upsert"
  on public.user_contact_settings for insert
  with check (auth.uid() = user_id);

create policy "Contact settings: own update"
  on public.user_contact_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Contact settings: own delete"
  on public.user_contact_settings for delete
  using (auth.uid() = user_id);
