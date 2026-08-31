-- ============================================================================
-- HuniOne — Chat: Perbaikan RLS reaksi pesan (message_reactions)
--
-- Masalah:
--   Policy "Reactions: insert own" sebelumnya hanya memverifikasi
--   (auth.uid() = user_id) — siapa pun yang login bisa menambahkan reaksi pada
--   pesan apa pun tanpa memastikan ia benar-benar partisipan (pengirim atau
--   penerima) pada direct_message terkait. Ini tidak konsisten dengan policy
--   SELECT yang sudah membatasi akses ke partisipan percakapan.
--
-- Perbaikan:
--   Policy INSERT baru memverifikasi bahwa auth.uid() adalah salah satu dari
--   sender_id / receiver_id pada baris direct_messages yang direaksikan.
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

drop policy if exists "Reactions: insert own"
  on public.message_reactions;

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
