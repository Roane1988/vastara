-- ============================================================================
-- HuniOne — Base schema (tabel inti)
-- ============================================================================
-- Tabel inti (profiles / properties / forum_posts / forum_replies) sebelumnya
-- hanya dibuat manual di dashboard Supabase, sehingga riwayat migration tidak
-- bisa di-replay pada database kosong: setiap migration yang menyentuh tabel
-- tersebut gagal dengan "relation ... does not exist".
--
-- File ini membuat ulang tabel inti dengan SKEMA ASLI, yaitu hanya kolom yang
-- sudah ada saat tabel pertama kali dibuat. Kolom yang ditambahkan kemudian
-- TIDAK ikut di sini supaya tiap migration tetap menjalankan perannya:
--
--   profiles
--     + is_super_admin      -> 20260815_admin_super_admin_role_guard.sql
--     + whatsapp_verified   -> 20260828_whatsapp_verification.sql
--     + last_seen_at        -> 20260831_whatsapp_chat_features.sql
--
--   properties
--     + city / district / certificate_status -> 20260730_add_property_columns.sql
--     + description_en / is_premium / facilities -> 20260803_property_listing_enhancements.sql
--     + seller_type (+ agent_id/owner_id yang lalu dibuang) -> 20260805_property_seller_type.sql
--     + original_price      -> 20260816_price_history.sql
--     + price_requested / price_change_status / price_requested_at /
--       price_reviewed_by / price_reviewed_at -> 20260816_property_price_change_guard.sql
--     + published_at        -> 20260820_property_published_at.sql
--     + price_period        -> 20260822_property_price_period.sql
--     + land_area_sqm / furnished -> 20260823_property_detail_fields.sql
--     + rt / rw / kelurahan -> 20260830_property_location_rt_rw_kelurahan.sql
--     + sold_source / sold_buyer_id / sold_at -> 20260831_dashboard_analytics.sql
--
--   forum_posts
--     + category            -> 20260731_add_forum_category.sql
--     + views / is_pinned / solved_reply_id / tags / poll -> 20260801_forum_enhancements.sql
--
--   forum_replies
--     (tidak ada kolom tambahan)
--
-- RLS diaktifkan di sini; policy-nya dibuat oleh migration terpisah:
--   - profiles             -> 20260730_profiles_rls_policies.sql
--   - properties           -> 20260730_properties_rls_policies.sql
--   - forum_posts/replies  -> 20260810_forum_rls_and_handle_new_user.sql
--
-- Idempotent: aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  email text,
  whatsapp text,
  role text default 'pembeli',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2. properties
-- ---------------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  category text not null default 'Dijual',
  title text not null,
  property_type text,
  price bigint,
  description_id text,
  address text,
  bedrooms integer default 0,
  bathrooms integer default 0,
  area_sqm integer default 0,
  image_url text,
  seller_whatsapp text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

alter table public.properties
  drop constraint if exists properties_property_type_check;

alter table public.properties
  add constraint properties_property_type_check
  check (property_type in ('Rumah', 'Apartemen', 'Villa', 'Tanah', 'Kantor', 'Ruko'));

create index if not exists properties_seller_id_idx on public.properties (seller_id);
create index if not exists properties_status_idx on public.properties (status);

-- ---------------------------------------------------------------------------
-- 3. forum_posts
-- ---------------------------------------------------------------------------
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

create index if not exists forum_posts_author_id_idx on public.forum_posts (author_id);
create index if not exists forum_posts_created_at_idx on public.forum_posts (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. forum_replies
-- ---------------------------------------------------------------------------
create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

create index if not exists forum_replies_post_id_idx on public.forum_replies (post_id);
create index if not exists forum_replies_author_id_idx on public.forum_replies (author_id);
