-- ============================================================================
-- HuniOne — Chat: reply pesan, lampiran gambar, dan berbagi properti
-- Menambah kolom pada direct_messages serta bucket storage untuk gambar chat.
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

-- Kolom reply: menunjuk ke pesan yang dibalas
alter table public.direct_messages
  add column if not exists reply_to_id uuid references public.direct_messages(id);

-- Kolom lampiran gambar (URL publik dari storage)
alter table public.direct_messages
  add column if not exists image_url text;

-- Kolom berbagi properti (mengarah ke baris properties)
alter table public.direct_messages
  add column if not exists property_id uuid references public.properties(id);

-- Bucket storage untuk gambar chat (publik, akses baca publik; tulis via autentikasi)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('CHAT_IMAGES', 'CHAT_IMAGES', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policy: pengguna terautentikasi boleh upload ke folder miliknya
do $$ begin
  create policy "Authenticated users can upload chat images"
    on storage.objects for insert
    with check (
      bucket_id = 'CHAT_IMAGES'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

-- Policy: pengguna terautentikasi boleh mengupdate/menghapus gambar miliknya
do $$ begin
  create policy "Authenticated users can update chat images"
    on storage.objects for update
    using (bucket_id = 'CHAT_IMAGES' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'CHAT_IMAGES' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Authenticated users can delete chat images"
    on storage.objects for delete
    using (bucket_id = 'CHAT_IMAGES' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;
