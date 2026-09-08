-- ============================================================================
-- HuniOne — Chat: bucket pesan suara (voice notes)
-- Menyediakan wadah storage untuk rekaman audio hasil MediaRecorder
-- (audio/webm, audio/mp4, audio/ogg) dengan jalur milik user masing-masing.
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('CHAT_VOICE', 'CHAT_VOICE', true, 20971520, array[
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/mpeg',
  'audio/x-m4a',
  'audio/aac',
  'audio/x-wav',
  'audio/wav'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "Authenticated users can upload chat voice notes"
    on storage.objects for insert
    with check (
      bucket_id = 'CHAT_VOICE'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can update chat voice notes"
    on storage.objects for update
    using (bucket_id = 'CHAT_VOICE' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'CHAT_VOICE' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can delete chat voice notes"
    on storage.objects for delete
    using (bucket_id = 'CHAT_VOICE' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;