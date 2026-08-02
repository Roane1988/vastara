-- ============================================================================
-- HuniOne — Agent directory completion & cleanup
--   2. Backfill: role='agent' tanpa agent_profiles (hasil promote manual/lama)
--   3. agent_reviews: cegah self-review & pastikan target benar-benar agen
--   5. Hapus kolom mati properties.agent_id / owner_id (tidak dibaca siapa pun)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2. Backfill agent_profiles untuk semua user ber-role agent yang belum punya
-- ----------------------------------------------------------------------------
insert into public.agent_profiles (user_id, full_name, whatsapp)
select
  p.id,
  coalesce(p.first_name, ''),
  coalesce(p.whatsapp, '')
from public.profiles p
where p.role = 'agent'
  and not exists (select 1 from public.agent_profiles ap where ap.user_id = p.id)
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. agent_reviews: reviewer tidak boleh menilai dirinya sendiri,
--    dan target (agent_id) harus benar-benar ber-role agent.
-- ----------------------------------------------------------------------------
drop policy if exists "Authenticated users can review agents" on public.agent_reviews;

create policy "Authenticated users can review agents"
  on public.agent_reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> agent_id
    and exists (
      select 1
      from public.profiles
      where id = agent_id
        and role = 'agent'
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Hapus kolom delegasi yang tidak pernah dibaca (dead columns)
-- ----------------------------------------------------------------------------
alter table public.properties
  drop column if exists agent_id,
  drop column if exists owner_id;
