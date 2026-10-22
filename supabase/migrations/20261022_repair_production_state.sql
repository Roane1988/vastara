-- ============================================================================
-- HuniOne — Repair: bring production DB in line with the migration chain
-- (22 Oktober 2026)
--
-- Latar belakang:
--   Saat rantai migration diuji ulang di database kosong, ditemukan beberapa
--   file yang TIDAK bisa dijalankan berurutan:
--     1. `20260828_whatsapp_verification.sql` gagal saat
--        `create or replace function public.get_my_profile()` karena tipe
--        return-nya berubah (kolom OUT tambah `whatsapp_verified`).
--        -> File tersebut sudah diperbaiki (drop function dulu).
--     2. `20260831_whatsapp_chat_features.sql` (k Creates `message_reactions`)
--        di-rename menjadi `20260831_chat_features_whatsapp.sql` supaya tabel
--        dibuat SEBELUM migration RLS reaksi.
--     3. `alter publication supabase_realtime` dibungkus cek pg_publication.
--
-- File ini bersifat idempotent dan aman dijalankan berulang kali. Jalankan di
-- Supabase SQL Editor untuk memastikan database production sama dengan hasil
-- replay migration (bisa juga di DB kosong).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_my_profile() — pastikan RPC mengembalikan whatsapp_verified
--    (tipe return fungsi TIDAK bisa diubah dengan create or replace, jadi
--     fungsi lama wajib di-drop lebih dulu)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists whatsapp_verified boolean not null default false;

comment on column public.profiles.whatsapp_verified is
  'Status verifikasi WhatsApp. Wajib true untuk dapat memasang listing properti.';

update public.profiles
  set whatsapp_verified = true
  where whatsapp_verified = false
    and coalesce(whatsapp, '') <> '';

drop function if exists public.get_my_profile();

create or replace function public.get_my_profile()
returns table (email text, whatsapp text, whatsapp_verified boolean)
language sql
security definer
set search_path = public
as $$
  select p.email, p.whatsapp, p.whatsapp_verified
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. profiles.last_seen_at — kolom "terakhir dilihat"
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. message_reactions — pastikan tabel + policy benar
--    Policy INSERT harus party-restricted (hanya partisipan percakapan).
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

drop policy if exists "Reactions: read participants" on public.message_reactions;
create policy "Reactions: read participants"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.direct_messages dm
      where dm.id = message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

drop policy if exists "Reactions: insert own" on public.message_reactions;
drop policy if exists "Reactions: insert own participant only" on public.message_reactions;
create policy "Reactions: insert own participant only"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.direct_messages dm
      where dm.id = message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

drop policy if exists "Reactions: delete own" on public.message_reactions;
create policy "Reactions: delete own"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

do $$ begin
  -- Publication supabase_realtime hanya ada di project Supabase; lewati bila tidak ada.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 4. user_contact_settings — pengaturan per-kontak (mute notifikasi)
-- ----------------------------------------------------------------------------
create table if not exists public.user_contact_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid not null references public.profiles(id) on delete cascade,
  muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, contact_id)
);

alter table public.user_contact_settings enable row level security;

drop policy if exists "Contact settings: own select" on public.user_contact_settings;
create policy "Contact settings: own select"
  on public.user_contact_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Contact settings: own upsert" on public.user_contact_settings;
create policy "Contact settings: own upsert"
  on public.user_contact_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Contact settings: own update" on public.user_contact_settings;
create policy "Contact settings: own update"
  on public.user_contact_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Contact settings: own delete" on public.user_contact_settings;
create policy "Contact settings: own delete"
  on public.user_contact_settings for delete
  using (auth.uid() = user_id);
