-- ============================================================================
-- HuniOne — Prioritas 0 (Hotfix): Amankan bucket Storage percakapan
-- ============================================================================
-- INSIDEN: bucket CHAT_IMAGES / CHAT_FILES / CHAT_VOICE dibuat dengan
-- `public = true`, sehingga setiap URL
--   https://<project>.supabase.co/storage/v1/object/public/<BUCKET>/<path>
-- dapat diunduh siapa pun tanpa login (kebocoran data lampiran chat).
--
-- PERBAIKAN:
--   1. Bucket chat dibuat PRIVATE.
--   2. Object path disimpan eksplisit di direct_messages
--      (image_path / file_path / file_bucket) + backfill dari URL lama,
--      supaya RLS bisa mengikat akses ke pesan tertentu.
--   3. storage.objects diberi RLS ketat:
--        SELECT -> hanya sender_id / receiver_id dari pesan yang memakai objek
--                   tersebut (divalidasi ulang oleh RLS direct_messages).
--        INSERT -> hanya folder milik pengirim (auth.uid()).
--        DELETE -> hanya peserta percakapan atau pemilik folder.
--        UPDATE -> tidak ada policy (objek immutable).
--   4. Frontend memakai createSignedUrl() (src/utils/signedUrl.js).
--
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Kolom path eksplisit pada direct_messages
-- ---------------------------------------------------------------------------
alter table public.direct_messages
  add column if not exists image_path text,
  add column if not exists file_path text,
  add column if not exists file_bucket text;

comment on column public.direct_messages.image_path is
  'Object path (tanpa bucket) file gambar di bucket CHAT_IMAGES.';
comment on column public.direct_messages.file_path is
  'Object path (tanpa bucket) file dokumen/voice note di bucket CHAT_FILES atau CHAT_VOICE.';
comment on column public.direct_messages.file_bucket is
  'Bucket sumber file_url: CHAT_FILES atau CHAT_VOICE.';

-- Backfill dari URL lama (format: .../storage/v1/object/public/<BUCKET>/<path>)
-- split_part() mengembalikan '' bila penanda tidak ditemukan -> object path null.
update public.direct_messages
set
  image_path = nullif(split_part(coalesce(image_url, ''), '/object/public/CHAT_IMAGES/', 2), ''),
  file_path = case
    when coalesce(file_url, '') = '' then null
    when lower(coalesce(file_type, '')) like 'audio/%'
         and split_part(file_url, '/object/public/CHAT_VOICE/', 2) <> ''
      then split_part(file_url, '/object/public/CHAT_VOICE/', 2)
    else nullif(split_part(file_url, '/object/public/CHAT_FILES/', 2), '')
  end,
  file_bucket = case
    when coalesce(file_url, '') = '' then null
    when lower(coalesce(file_type, '')) like 'audio/%'
         and split_part(file_url, '/object/public/CHAT_VOICE/', 2) <> ''
      then 'CHAT_VOICE'
    else 'CHAT_FILES'
  end
where image_url is not null or file_url is not null;

-- Index pendukung lookup policy RLS storage.objects
create index if not exists direct_messages_image_path_idx
  on public.direct_messages (image_path)
  where image_path is not null;

create index if not exists direct_messages_file_path_idx
  on public.direct_messages (file_path)
  where file_path is not null;

-- ---------------------------------------------------------------------------
-- 2. Fungsi bantu: apakah pengguna saat ini boleh melihat objek ini?
-- ---------------------------------------------------------------------------
-- security invoker (default): RLS pada direct_messages TETAP berlaku saat
-- fungsi ini dievaluasi, sehingga baris pesan yang tidak boleh dibaca user
-- tetap tersaring oleh lapisan kedua.
create or replace function public.chat_attachment_visible(p_bucket text, p_path text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p_bucket is not null
     and p_path is not null
     and exists (
       select 1
       from public.direct_messages dm
       where (
             (p_bucket = 'CHAT_IMAGES' and dm.image_path = p_path)
          or (p_bucket = 'CHAT_FILES'  and dm.file_path  = p_path and dm.file_bucket = 'CHAT_FILES')
          or (p_bucket = 'CHAT_VOICE'  and dm.file_path  = p_path and dm.file_bucket = 'CHAT_VOICE')
          -- Fallback untuk baris yang belum pernah di-backfill (mis. pesan
          -- yang dibuat klien versi lama sebelum migrasi ini dijalankan):
          -- cocokkan object path dari URL publik lama.
          or (p_bucket = 'CHAT_IMAGES' and dm.image_url is not null
              and split_part(dm.image_url, '/object/public/CHAT_IMAGES/', 2) = p_path)
          or (p_bucket = 'CHAT_FILES'  and dm.file_url  is not null
              and split_part(dm.file_url,  '/object/public/CHAT_FILES/',  2) = p_path)
          or (p_bucket = 'CHAT_VOICE'  and dm.file_url  is not null
              and split_part(dm.file_url,  '/object/public/CHAT_VOICE/',  2) = p_path)
       )
       and dm.deleted_at is null
       and (dm.sender_id = (select auth.uid()) or dm.receiver_id = (select auth.uid()))
     );
$$;

revoke execute on function public.chat_attachment_visible(text, text) from public, anon;
grant execute on function public.chat_attachment_visible(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Bucket chat -> PRIVATE
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false,
    updated_at = now()
where id in ('CHAT_IMAGES', 'CHAT_FILES', 'CHAT_VOICE');

-- ---------------------------------------------------------------------------
-- 4. Ganti policy storage.objects yang lama (folder-based, terlalu longgar)
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can upload chat images" on storage.objects;
drop policy if exists "Authenticated users can update chat images" on storage.objects;
drop policy if exists "Authenticated users can delete chat images" on storage.objects;

drop policy if exists "Authenticated users can upload chat files" on storage.objects;
drop policy if exists "Authenticated users can update chat files" on storage.objects;
drop policy if exists "Authenticated users can delete chat files" on storage.objects;

drop policy if exists "Authenticated users can upload chat voice notes" on storage.objects;
drop policy if exists "Authenticated users can update chat voice notes" on storage.objects;
drop policy if exists "Authenticated users can delete chat voice notes" on storage.objects;

-- Hapus juga policy lama bila pernah dibuat dengan nama berbeda.
drop policy if exists "Authenticated users can read chat images" on storage.objects;
drop policy if exists "Authenticated users can read chat files" on storage.objects;
drop policy if exists "Authenticated users can read chat voice notes" on storage.objects;

-- Hapus SEMUA policy storage.objects yang menyebut bucket chat, apa pun
-- namanya. Dashboard Supabase otomatis membuat policy seperti
-- "Allow public read access" saat bucket dibuat dengan public = true; policy
-- itulah yang membuat lampiran chat bisa dibaca semua orang. Policy di bawah
-- dibuat ulang dengan aturan yang lebih ketat.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '')       like '%CHAT_IMAGES%'
        or coalesce(with_check, '') like '%CHAT_IMAGES%'
        or coalesce(qual, '')       like '%CHAT_FILES%'
        or coalesce(with_check, '') like '%CHAT_FILES%'
        or coalesce(qual, '')       like '%CHAT_VOICE%'
        or coalesce(with_check, '') like '%CHAT_VOICE%'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Policy baru: akses hanya untuk peserta percakapan
-- ---------------------------------------------------------------------------
do $$
declare
  b text;
  n_select text;
  n_insert text;
  n_delete text;
begin
  foreach b in array array['CHAT_IMAGES', 'CHAT_FILES', 'CHAT_VOICE'] loop

    -- Nama policy harus unik per tabel, jadi nama diberi akhiran nama bucket.
    n_select := 'Chat attachments readable by conversation participants - ' || b;
    n_insert := 'Chat attachment upload restricted to own folder - ' || b;
    n_delete := 'Chat attachments deletable by conversation participants - ' || b;

    execute format('drop policy if exists %I on storage.objects', n_select);
    execute format('drop policy if exists %I on storage.objects', n_insert);
    execute format('drop policy if exists %I on storage.objects', n_delete);

    -- SELECT: hanya sender_id / receiver_id dari pesan yang memakai objek ini.
    execute format($p$
      create policy %I
        on storage.objects for select
        to authenticated
        using (
          bucket_id = %L
          and public.chat_attachment_visible(bucket_id, name)
        );
    $p$, n_select, b);

    -- INSERT: objek baru hanya boleh dibuat di folder milik pengirim.
    -- (Object path harus ada sebelum baris pesan dibuat, jadi pengecekan
    --  dilakukan lewat folder, bukan lewat keanggotaan percakapan.)
    execute format($p$
      create policy %I
        on storage.objects for insert
        to authenticated
        with check (
          bucket_id = %L
          and (storage.foldername(name))[1] = (select auth.uid()::text)
        );
    $p$, n_insert, b);

    -- DELETE: peserta percakapan, atau pemilik folder (untuk membersihkan
    -- unggahan yang gagal / pesan yang sudah dihapus).
    execute format($p$
      create policy %I
        on storage.objects for delete
        to authenticated
        using (
          bucket_id = %L
          and (
            public.chat_attachment_visible(bucket_id, name)
            or (storage.foldername(name))[1] = (select auth.uid()::text)
          )
        );
    $p$, n_delete, b);

  end loop;
end $$;

-- Catatan: tidak ada policy UPDATE untuk bucket chat -> objek tidak bisa
-- ditimpa/diubah setelah diunggah (immutable).

-- ---------------------------------------------------------------------------
-- 6. Housekeeping: hapus policy SELECT yang membuat objek terbaca publik
-- ---------------------------------------------------------------------------
-- Bucket private berarti policy SELECT pada storage.objects tidak lagi Needed
-- untuk akses via public URL; policy di atas (cek partisipan) tetap berlaku
-- untuk pensigned URL yang dibuat server-side oleh Storage API.
