-- ============================================================================
-- HuniOne — Read receipts & unread persisten untuk chat (direct_messages)
-- Menambah kolom read_at + policy UPDATE untuk receiver + realtime UPDATE
-- agar status "Dibaca" bisa menyebar live ke pengirim.
-- ============================================================================

alter table public.direct_messages add column if not exists read_at timestamptz;

do $$ begin
  create policy "Users can mark received messages as read"
    on public.direct_messages for update
    using (auth.uid() = receiver_id)
    with check (auth.uid() = receiver_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
end $$;