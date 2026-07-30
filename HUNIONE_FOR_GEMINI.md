# HuniOne — Ringkasan Proyek untuk Gemini AI

Platform properti (jual/beli/sewa) dengan AI chatbot, realtime chat, admin dashboard. Deploy di Vercel (SPA + serverless) — domain **hunione.com**.

## Tech Stack
- **React 19 + Vite 8** — JavaScript (JSX)
- **Tailwind CSS v4** — konfigurasi via CSS `@theme` di `index.css` (tidak ada `tailwind.config.js`)
- **React Router DOM v7** — SPA routing, code splitting via `React.lazy()` + `Suspense`
- **Supabase** — Auth, Database (Postgres), Realtime, Storage, RLS
- **lucide-react** — icons
- **framer-motion** — animasi
- **react-i18next** — i18n ID/EN
- **Groq API** (llama-3.3-70b-versatile) — chatbot + translation + AI description, via backend proxy di `/api/groq`

## Routes
| Path | Component | Auth | Notes |
|---|---|---|---|
| `/` atau `/explore` | ExplorePage | Tidak | filter by status='verified', back-to-top button, lazy loading images |
| `/login` | MinimalistLogin | Tidak | |
| `/sell` | SellPropertyPage (3-step) | Ya | + edit via `?edit=ID`, beforeunload guard, draft autosave |
| `/my-listings` | MyListingsPage | Ya | Edit & Tandai Terjual buttons |
| `/saved` | SavedPropertiesPage | Ya | sync from DB via `saved_properties` table |
| `/chat` | ChatHubPage (realtime DM) | Tidak (login prompt) | ArrowLeft lucide icon |
| `/forum` | ForumPage | Tidak | |
| `/forum/:id` | ForumDetailPage | Tidak | |
| `/property/:id` | PropertyDetailPage | Tidak | Properti Serupa, KPR simulator, lightbox gallery |
| `/admin` | AdminDashboardPage | Ya (admin only) | preview modal, soft reject, bulk verify, pagination, realtime |
| `/kpr` | KprCalculatorPage | Tidak | amortization table, biaya tambahan |
| `*` | NotFoundPage | Tidak | wildcard route, bukan redirect |
| `/coming-soon` | ComingSoonPage | Tidak | |

## Fitur Utama

### 1. SellPropertyPage (3-Step Flow)
- **Step 0 — Info Properti**: kategori (Dijual/Disewa), tipe properti, judul, harga, KT/KM/sqm, sertifikat, deskripsi + tombol **Saran AI** via Groq API (`model: llama-3.3-70b-versatile`, parse `choices[0].message.content`), alamat, kota, kecamatan
- **Step 1 — Foto & Lokasi**: upload multi-image (max 10, max 5MB, JPG/PNG/WEBP/AVIF), **drag-and-drop reorder**, upload paralel ke Supabase Storage `PROPERTIES_IMAGE`
- **Step 2 — Review & Kirim**: PreviewCard, ringkasan, input WhatsApp, submit
- Draft **autosave ke localStorage** — restore otomatis saat kembali
- **Navigation confirmation**: `beforeunload` jika ada perubahan belum tersimpan
- **Edit mode**: `/sell?edit=PROPERTY_ID` — load data existing, submit via `.update()` bukan `.insert()`
- Submit: insert ke `properties` dengan `status: 'pending'`

### 2. ExplorePage (Home)
- Hero banner, search bar, filter drawer (server-side via Supabase query), grid properti
- **Tabs filter**: Dijual/Disewa/Baru — benar-benar filter data via `.eq('category', ...)`
- Hanya tampilkan properti dengan `status === 'verified'`
- Back-to-top button (muncul setelah scroll > 600px, smooth scroll)
- Lazy loading images (`loading="lazy"`)
- Dynamic EN translation via `batchTranslate()`

### 3. PropertyDetailPage
- **Gallery**: Desktop (Airbnb-style grid) / Mobile (hero + thumb grid) + Lightbox (fullscreen, keyboard nav)
- **Agent Card**: sticky sidebar (desktop), floating WhatsApp bar (mobile, IntersectionObserver — deps `[loading]` fixed)
- **KprSimulator**: mortgage calculator
- **Properti Serupa**: grid 6 item, filter by category/city, exclude current ID, limit 6, status='verified'
- **Accordion**: Panduan Membeli + Disclaimer
- Dynamic EN translation via `useGroqTranslation` hook
- Lazy loading images

### 4. KPR Calculator
- **KprSimulator.jsx** (reusable): annuity formula, DP slider 0-50%
- **KprCalculatorPage.jsx** (full page): 2-column, DP 0-80%, amortization table (yearly), biaya tambahan (BPHTB 5%, PPN 11%, Notaris 1%, Provisi 1%), WhatsApp integration

### 5. HuniBot (AI Chatbot)
- Floating chat widget via Groq API
- Personalized greeting, contextual KPR, route-aware hiding
- Animated bubbles via framer-motion
- Purpose-based system prompt: `chat` (ID) vs `translation` (EN, JSON-only)

### 6. ChatHubPage (Realtime DM)
- Two-column: contact list + chat window
- Mobile toggle, realtime subscription via Supabase Realtime
- ArrowLeft icon dari lucide-react (bukan custom SVG)

### 7. Admin Dashboard
- **3-tab**: Overview (analytics + pending table), Users (role management via dropdown), Audit (log trail)
- **AdminDashboardPage enhancements**: preview modal (gallery, inline property info), reject modal (required reason → `audit_log`), soft delete (status='rejected' + restore button), filter tabs (Semua/Pending/Terverifikasi/Ditolak), bulk verify (checkboxes), pagination (10/page), thumbnails di table, search input, realtime subscription (INSERT/UPDATE on properties)
- **ConfirmModal**: props `danger`, `icon`, `children`, `confirmDisabled`
- **AdminAnalyticsCards**: 4 metric cards
- **AdminAuditLog**: 100 recent entries

### 8. Forum
- **ForumPage**: post cards dengan avatar inisial + warna hash, compose form dengan **category selector** (Umum/KPR/Legalitas/Tips Properti/Rekomendasi), **search bar** + **filter by category**, **edit post inline**, **delete** dengan ConfirmModal loading state, dynamic **category badges** (warna berbeda per kategori)
- **ForumDetailPage**: post detail + **like/upvote system** (toggle via `forum_likes` table, polymorphic target_type `post`/`reply`), **edit post** inline, **edit reply** inline, **quote reply** (`<!--replyto:authorName|snippet-->`), realtime subscription ke INSERT `forum_replies`, **auto-scroll** ke reply baru, **cancel confirmation** saat batalkan balasan, **success toast** setelah reply/kirim

### 9. Favorites (Saved Properties)
- **Sync ke database**: table `saved_properties` (user_id, property_id, unique constraint)
- **utils/favorites.js**: `setSupabase(client)`, `async initFavorites(userId)` load from DB, `async toggleFavorite(id)` write localStorage + Supabase in background
- **AuthContext**: panggil `setSupabase()` on mount, `initFavorites()` on auth state change

## Database Supabase

### Table `properties`
- `id` (uuid PK), `seller_id` (FK → profiles), `category`, `title`, `property_type`, `price` (bigint)
- `description_id`, `description_en` (text)
- `address`, `city`, `district`, `certificate_status`
- `bedrooms`, `bathrooms`, `area_sqm` (bukan `sqm`)
- `image_url` (text — single URL or JSON.stringify([...]))
- `seller_whatsapp`, `status` ('pending'/'verified'/'rejected'), `created_at`
- **Column naming**: `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`)

### Table `profiles`
- `id` (uuid PK, references auth.users), `first_name`, `email`, `whatsapp`, `role`, `created_at`, `updated_at`
- Role values: `pembeli`, `owner`, `agent`, `developer`, `admin`

### Table `saved_properties`
- `id` (uuid PK), `user_id` (FK → profiles), `property_id` (FK → properties), `created_at`
- Unique constraint on `(user_id, property_id)`

### Table `audit_logs`
- `id`, `admin_id`, `admin_name`, `action_type`, `target_type`, `target_id`, `target_detail` (JSONB), `created_at`

### Table `direct_messages`
- `id`, `sender_id`, `receiver_id`, `content`, `created_at`

### Table `forum_posts`
- `id` (uuid PK), `author_id` (FK → profiles), `title`, `content`, `category` (text, default 'Umum'), `created_at`
- RLS: select all, insert/update/delete hanya author

### Table `forum_replies`
- `id` (uuid PK), `post_id` (FK → forum_posts), `author_id` (FK → profiles), `content` (support quoted reply format `<!--replyto:authorName|snippet-->`), `created_at`
- RLS: select all, insert/update/delete hanya author
- Realtime: INSERT on `forum_replies` (subscribe di ForumDetailPage)

### Table `forum_likes`
- `id` (uuid PK), `user_id` (FK → profiles), `target_id` (uuid — post or reply ID), `target_type` (text — 'post' or 'reply'), `created_at`
- Unique constraint on `(user_id, target_id, target_type)`
- RLS: select all, insert/delete only owner

### Storage `PROPERTIES_IMAGE`
- Bucket public, file path: `{userId}-{timestamp}-{sanitizedFileName}`
- Multi-image: `parseImages(imageUrl)` → array (handle single URL, JSON array, array literal)

## API

### `/api/groq` (Vercel Serverless + Vite Dev Proxy)
- Proxy ke Groq API dengan `GROQ_API_KEY`
- **Input sanitization**: null bytes, control characters, `<script>`, `data:text/html`, `vbscript:`
- **Output guard**: replace dangerous content with `[diblokir]`
- **Session limit**: 50 messages per IP per hour
- **Audit log**: in-memory ring buffer (1000 entries)
- **BLOCKED_PATTERNS**: block prompt injection (`DAN` sudah dihapus karena bentrok dengan kata "dan" bahasa Indonesia)
- Rate limit: 20 req/min per IP (in-memory)
- Model: hanya `llama-3.3-70b-versatile`
- Purpose: `chat` (system: ID) atau `translation` (system: EN JSON-only)

## RLS Policies

### `properties`
- Anyone can view verified (`status = 'verified'`)
- Sellers can view own (`auth.uid() = seller_id`)
- Admins can view all (`auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')`)
- Sellers can insert own (`auth.uid() = seller_id`)
- Sellers can update own (same)
- Admins can update all (same subquery)
- Sellers/admins can delete own/all

### `profiles`
- Anyone can view (`true`)
- Users can insert own (`auth.uid() = id`)
- Users can update own, **but cannot set role to 'admin'** — dicegah via `WITH CHECK (role IS DISTINCT FROM 'admin')`
- Admins can update all profiles (full access)
- Admins can delete

### `saved_properties`
- Users can select/insert/delete only their own (`auth.uid() = user_id`)

## SEO
- **useSEO hook** (`src/hooks/useSEO.js`): sets `document.title`, meta description, `og:title`, `og:description`, `og:image`, `og:url`
- Dipanggil di ExplorePage, PropertyDetailPage, SellPropertyPage, KprCalculatorPage, NotFoundPage

## Error Handling
- **ErrorBoundary** (`src/components/ErrorBoundary.jsx`): class component, catches render errors, shows reload button + dev stack trace
- Semua async effect pakai `cancelledRef` untuk cegah state update setelah unmount
- Image fallback: semua `<img>` dari DB punya `onError` → `FALLBACK_IMAGE` (exported dari `utils/images.js`)

## Code Splitting
- Semua route components di `App.jsx` pakai `React.lazy()` + `Suspense` dengan `PageLoader` spinner
- Bundle size: 849KB → 671KB (gzip 199KB)

## Keamanan
- RLS diperketat: profiles update dicegah naik ke admin (kecuali admin sendiri)
- Properties: seller bisa lihat propertinya sendiri (termasuk pending)
- Input/output sanitization di Groq proxy
- CSP di vercel.json, CORS locked ke hunione.com
- `auth.uid()` tidak bisa dipalsukan

## Konvensi Kode
- `useAuth()` → `{ session, user, loading, showToast, signOut }`. `signOut` via `handleLogout` dari App
- Color palette: `brand-primary` (#1E3A5F), `brand-accent` (#4A90E2), `brand-bg` (#F8FAFC), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#6B7280), `brand-border` (#E5E7EB), `brand-highlight` (#EDF4FD), `brand-verified` (#2E8B57), `brand-danger` (#DC2626)
- Logo: `public/huniOne.svg` via `<img>` (viewBox-based)
- Shared utils: `format.js` (formatPrice), `avatar.js` (getAvatarColor, getInitials), `time.js` (timeAgo), `favorites.js` (setSupabase, initFavorites, toggleFavorite), `images.js` (parseImages, FALLBACK_IMAGE, getImageSrc)

## Migrations SQL
Semua file di `supabase/migrations/`:
1. `20260727_create_audit_logs.sql`
2. `20260727_create_direct_messages.sql`
3. `20260730_add_property_columns.sql`
4. `20260730_create_saved_properties.sql`
5. `20260730_properties_rls_policies.sql`
6. `20260730_profiles_rls_policies.sql`
7. `20260731_create_forum_likes.sql`
8. `20260731_add_forum_category.sql`

**Catatan**: PostgreSQL 14 tidak support `CREATE POLICY IF NOT EXISTS` — harus pakai `DROP POLICY IF EXISTS` dulu sebelum `CREATE POLICY`.
