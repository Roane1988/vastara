-- ============================================================================
-- HuniOne — Chat: soft delete pesan (placeholder "Pesan ini telah dihapus")
-- Menambah kolom deleted_at pada direct_messages agar pengirim dapat menandai
-- pesannya sendiri sebagai dihapus tanpa menghapus baris permanen (riwayat dan
-- balasan/sematan tetap terjaga).
-- Idempotent: aman dijalankan ulang.
--
-- Cara kerja:
--   * Sender menandai deleted_at via UPDATE (bukan DELETE) pada pesan miliknya.
--   * Receiver boleh menandai read_at seperti biasa, tetapi tidak boleh mengubah
--     deleted_at (placeholder tetap muncul kedua sisi).
-- ============================================================================

-- 1. Kolom deleted_at
alter table public.direct_messages
  add column if not exists deleted_at timestamptz;

-- 2. Izinkan klien meng-update kolom deleted_at (kolom read_at sudah di-grant
--    sebelumnya; grant column-level bersifat aditif).
grant update (deleted_at) on public.direct_messages to authenticated;

-- 3. Perbarui policy receiver: boleh menandai read_at, tetapi dilarang
--    mengubah deleted_at (harus tetap null) — receiver tidak boleh menghapus
--    pesan pengirim.
drop policy if exists "Users can mark received messages as read" on public.direct_messages;
create policy "Users can mark received messages as read"
  on public.direct_messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id and deleted_at is null);

-- 4. Policy baru: pengirim boleh menandai pesannya sendiri sebagai dihapus
--    (wajib mengisi deleted_at, hanya pada baris miliknya).
do $$ begin
  create policy "Users can delete their own sent messages"
    on public.direct_messages for update
    using (auth.uid() = sender_id)
    with check (auth.uid() = sender_id and deleted_at is not null);
exception when duplicate_object then null;
end $$;
