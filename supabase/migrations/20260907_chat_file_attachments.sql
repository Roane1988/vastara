-- ============================================================================
-- HuniOne — Chat: lampiran file (PDF/doc, dll)
-- Menambah kolom metadata file pada direct_messages serta bucket CHAT_FILES.
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

alter table public.direct_messages
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_type text;

-- Bucket storage untuk file chat (publik, akses baca publik; tulis via autentikasi)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('CHAT_FILES', 'CHAT_FILES', true, 20971520, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "Authenticated users can upload chat files"
    on storage.objects for insert
    with check (
      bucket_id = 'CHAT_FILES'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can update chat files"
    on storage.objects for update
    using (bucket_id = 'CHAT_FILES' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'CHAT_FILES' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can delete chat files"
    on storage.objects for delete
    using (bucket_id = 'CHAT_FILES' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;