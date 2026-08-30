-- ============================================================================
-- HuniOne — Chat: batasi UPDATE direct_messages hanya pada kolom read_at
-- Preventif: receiver tidak boleh mengubah kolom lain (content, sender_id,
-- receiver_id, reply_to_id, image_url, property_id) lewat klien.
-- Idempotent: aman dijalankan ulang.
--
-- Cara kerja:
--   1. RLS "for update" tetap menahan akses baris ke receiver pesan.
--   2. Privilege UPDATE tabel dicabut dari role authenticated.
--   3. Privilege UPDATE kolom-read_at (column-level) diberikan kembali,
--      jadi hanya kolom read_at yang bisa ditulis klien.
-- ============================================================================

-- Hapus policy lama yang membolehkan update bebas seluruh kolom oleh receiver.
drop policy if exists "Users can mark received messages as read" on public.direct_messages;

-- Cabut izin update tabel secara utuh, lalu beri izin update hanya kolom read_at.
revoke update on public.direct_messages from authenticated;
grant update (read_at) on public.direct_messages to authenticated;

-- Pasang kembali pembatas baris: hanya receiver yang boleh menandai baca
-- (lalu diikut pengecekan kolom dari role-level grant di atas).
create policy "Users can mark received messages as read"
  on public.direct_messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);