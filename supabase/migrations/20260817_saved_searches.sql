-- ============================================================================
-- HuniOne — Pencarian Tersimpan (Saved Search Alert)
-- Tujuan:
--   1. Simpan kriteria pencarian user (filters jsonb) untuk dijadikan alert.
--   2. `last_checked_at` dipakai aplikasi untuk menandai "properti baru sejak
--      cek terakhir" — aplikasi melakukan pengecekan saat halaman dibuka.
--   3. `active` sebagai toggle agar user bisa pause alert tanpa menghapus.
-- ============================================================================

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Pencarian saya',
  filters jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.saved_searches enable row level security;

create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id, created_at desc);

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own" on public.saved_searches
  for select using (auth.uid() = user_id);

drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own" on public.saved_searches
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_searches_update_own" on public.saved_searches;
create policy "saved_searches_update_own" on public.saved_searches
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own" on public.saved_searches
  for delete using (auth.uid() = user_id);
