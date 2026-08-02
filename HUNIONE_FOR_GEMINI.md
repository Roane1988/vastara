# HuniOne — Ringkasan Proyek untuk Gemini AI

Platform properti (jual/beli/sewa) dengan AI chatbot, realtime chat, forum komunitas, bandingkan properti, pendaftaran agen publik, admin dashboard. Deploy di Vercel (SPA + serverless) — domain **hunione.com**. Pembaruan terakhir: 2 Agustus 2026.

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
| `/` atau `/explore` | ExplorePage | Tidak | filter by status='verified', back-to-top button, lazy loading images, **Cari Properti** scroll & fokus ke kotak pencarian, quick menu "Cari Agen" → `/agent-apply` |
| `/login` | MinimalistLogin | Tidak | |
| `/sell-role` | RoleSelectionPage | Ya | onboarding pilih peran sebelum iklan properti |
| `/agent-apply` | AgentApplicationPage | Tidak (publik) | form pendaftaran agen eksternal → insert `agent_applications` |
| `/sell` | SellPropertyPage (3-step) | Ya | + edit via `?edit=ID`, beforeunload guard, draft autosave |
| `/my-listings` | MyListingsPage | Ya | Edit & Tandai Terjual buttons |
| `/saved` | SavedPropertiesPage | Ya | sync from DB via `saved_properties` table |
| `/chat` | ChatHubPage (realtime DM) | Tidak (login prompt) | ArrowLeft lucide icon |
| `/forum` | ForumPage | Tidak | hero stats, category pills, sort tabs, search + filter tag via `?tag=` |
| `/forum/:id` | ForumDetailPage | Tidak | views counter, reactions, poll, best answer, AI summarize, related threads, share |
| `/property/:id` | PropertyDetailPage | Tidak | Properti Serupa, KPR simulator, lightbox gallery |
| `/admin` | AdminDashboardPage | Ya (admin only) | **4-tab** (Overview/Users/Audit/**Agen**), preview modal, soft reject, bulk verify, pagination, realtime |
| `/kpr` | KprCalculatorPage | Tidak | amortization table, biaya tambahan |
| `/compare` | ComparePage | Tidak | bandingkan max 3 properti + affordability dari financial profile |
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
- **Quick menu "Cari Properti"**: `scrollIntoView` ke kotak pencarian lalu auto-focus input (bukan redirect lagi)
- **Quick menu "Cari Agen"**: navigasi ke `/agent-apply`
- **RecentlyViewed** (`<RecentlyViewed />`): kartu horizontal properti yang terakhir dilihat
- **CompareBar** (`<CompareBar />`): floating bar bottom saat ada item di keranjang banding

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
- **Enhancements (Aug 2026)**: ringkasan finansial (DP, pokok, total bunga, total bayar), **minimum income** (cicilan / 0.3), **CountUp** animasi angka (`CountUp.jsx` via rAF easeOutCubic), **DP presets** (10/20/30/50%) + **tenor presets** (10/15/20/25 th), slider DP diperbaiki, tombol **HuniBot** (custom event `open-hunibot-question` dengan konteks harga/DP/bunga/tenor), tombol **WhatsApp** share, integrasi `financialProfile` (batas ideal dari `maxInstallment`, progress bar, saran naik DP/perpanjang tenor saat cicilan melebihi batas), i18n

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
- **4-tab**: Overview (analytics + pending table), Users (role management via dropdown), Audit (log trail), **Agen** (review pendaftaran agent eksternal)
- **AdminDashboardPage enhancements**: preview modal (gallery, inline property info), reject modal (required reason → `audit_logs`), soft delete (status='rejected' + restore button), filter tabs (Semua/Pending/Terverifikasi/Ditolak), bulk verify (checkboxes), pagination (10/page), thumbnails di table, search input, realtime subscription (INSERT/UPDATE on properties)
- **AdminAgentApplications**: daftar pendaftaran calon agen (`agent_applications`) dengan filter Pending/Disetujui/Ditolak/Semua, tombol **Setujui** (→ status approved + trigger update role profil ke 'agent') dan **Tolak** (wajib alasan → `reject_reason`, ConfirmModal + textarea), catat `audit_logs` (`approve_agent`/`reject_agent`, target_type `agent_application`)
- **ConfirmModal**: props `danger`, `icon`, `children`, `confirmDisabled`
- **AdminAnalyticsCards**: 4 metric cards
- **AdminAuditLog**: 100 recent entries

### 8. Forum (enhanced Aug 2026)
- **ForumPage**:
  - **Hero card** gradient (badge Sparkles, judul, subtitle) + **stats** diskusi/replies/members (fetch count paralel)
  - **Category pills** horizontal dengan counter per kategori (filter aktif = pill terisi), search bar, sort tabs (**Terbaru / Populer / Belum Dijawab** — skor = replies + reactions), pagination "Load More" (10/batch)
  - **Badges** per post: **Disematkan** (pin, admin toggle), **Terjawab** (solved_reply_id), **HOT** (Flame bila replies+reactions ≥ 5), Poll badge, category badge
  - **Tags**: input `#tag` saat compose → kolom `tags text[]`; filter by tag (via `?tag=` URL param), tag chip bisa diklik
  - **Poll**: compose form bisa tambah poll (pertanyaan + 2-4 opsi), disimpan di kolom `poll jsonb`
  - **Markdown**: komposer punya tab Write/Preview; konten & preview dirender via `<Markdown />` (heading, list, bold/italic, code, link, quote, `#tag` clickable)
  - **Share** via WhatsApp popup (`window.open` ke `wa.me`), **edit inline**, **delete** + **cancel compose confirm**, skeleton loading cards
- **ForumDetailPage**:
  - **Views counter**: increment `forum_posts.views` sekali per buka (guard `viewedRef`)
  - **Reactions multi-emoji** (👍❤️🔥💡) di post & reply via tabel `forum_reactions` (unique user+target), toggle / ganti emoji, realtime `*` event
  - **Poll render**: bar persentase, vote sekali per user (`forum_poll_votes` upsert on conflict `post_id,user_id`), badge "suara Anda"
  - **Best answer**: OP bisa tandai balasan sebagai solusi (`solved_reply_id`) — balasan dapat border emerald + badge "Jawaban Terbaik"
  - **AI Summarize**: tombol "Ringkas" → POST ke `/api/groq` (purpose chat) merangkum judul+konten+replies jadi poin
  - **Related threads**: 3 post se-kategori (exclude current), klik → navigasi
  - **Share** via WhatsApp, **quote reply**, **edit post/reply inline**, realtime INSERT `forum_replies` + `forum_reactions`, auto-scroll, success toast, cancel confirm
- **Markdown.jsx** + **utils/markdown.js**: parser markdown ringan tanpa library (blocks: h1-h3, quote, ul/ol, paragraph; inline: bold/italic/code/link/`#tag`; `isSafeUrl` hanya izinkan http(s) & path relatif)

### 9. Compare Properti
- **utils/compare.js**: localStorage key `vastara_compare`, **MAX_ITEMS = 3**, `getCompareList/addToCompare/removeFromCompare/isInCompare/clearCompare`, event `compare-updated`
- **CompareBar** (bottom fixed bar): muncul saat ada item, thumbnail + title + remove per item, counter `n/3`, tombol "Bandingkan" → `/compare`
- **ComparePage** (`/compare`):
  - Table perbandingan (gambar, harga + badge **Termurah**, cicilan KPR estimasi, tipe, KT/KM, luas, kota, alamat, sertifikat)
  - **Personalization affordability**: baca `user_financial_profiles` → `computeAffordability` (take-home × 30% atau budget) → **buying power** (`maxAffordablePrice`) → badge **"Dalam Jangkauan"/"Di Atas Budget"** per properti, cicilan merah bila > `maxInstallment`, banner summary (buying power + cicilan maksimal)
  - **Empty financial profile**: banner CTA "Isi profil finansial" → dispatch `open-financial-profile` (auto-buka ProfileDrawer, auto-refresh via event `financial-profile-saved`)
  - Skeleton loading, request race-guard (`requestRef`), sync live via `compare-updated` + `storage` events

### 10. Recently Viewed
- **utils/recentlyViewed.js**: localStorage key `vastara_recently_viewed`, max 10, event `recently-viewed-changed`
- **RecentlyViewed** (di ExplorePage): kartu horizontal `w-40` dengan **hapus per-item** (X), **hapus semua** (Trash2), **scroll kiri/kanan** (desktop), **label waktu** "Dilihat {timeAgo}", **tombol compare** per kartu (toggle + toast max), live sync via `storage` + `recently-viewed-changed`, i18n
- `PropertyDetailPage` memanggil `addRecentlyViewed(property)` saat properti dimuat

### 11. Pendaftaran Agen Publik
- **AgentApplicationPage** (`/agent-apply`, publik tanpa login): form full_name, email, whatsapp (wajib), agency, experience (<1/1-3/3-5/5+ tahun), region, portfolio, **checkbox persetujuan** (wajib), info review 3-langkah. Submit → insert `agent_applications` (status default 'pending'), tampil success state. `useSEO` title/description.
- **AdminAgentApplications** di dashboard admin tab **Agen**: list + filter + approve/reject (lihat bagian 7).
- Approval mengaktifkan **trigger** `handle_agent_approval()` yang otomatis update `profiles.role = 'agent'` untuk user dengan email yang sama (kecuali admin).

### 12. Favorites (Saved Properties)
- **Sync ke database**: table `saved_properties` (user_id, property_id, unique constraint)
- **utils/favorites.js**: `setSupabase(client)`, `async initFavorites(userId)` load from DB, `async toggleFavorite(id)` write localStorage + Supabase in background
- **AuthContext**: panggil `setSupabase()` on mount, `initFavorites()` on auth state change
- **SavedPropertiesList.jsx** (shared): daftar properti favorit reusable dengan skeleton, fallback ke `DUMMY_PROPERTIES` saat fetch gagal — dipakai HamburgerMenu & ProfileDrawer

### 13. Navigasi (HamburgerMenu / SlideOver)
- **HamburgerMenu rewrite**: a11y (role/aria, keyboard), i18n penuh, pakai **SavedPropertiesList** shared (bukan fetch duplikat)
- **Logout confirm**: klik Logout → ConfirmModal (bukan langsung signOut)
- **Unread chat badge**: `useChatUnread(userId)` menghitung `direct_messages` (receiver = user, created_at > `huniOne_last_chat_read` di localStorage) + realtime INSERT → badge merah `n/99+` di item Chat
- **Language switcher inline**: panel pilih bahasa ID/EN di dalam drawer
- **Reduced motion**: `usePrefersReducedMotion()` (matchMedia `prefers-reduced-motion`) dipakai di SlideOver/HamburgerMenu
- **SlideOver.jsx**: reusable drawer base dengan a11y (Escape close, focus trap, `z-index` numerik, respect reduced motion)

## Database Supabase

### Table `properties`
- `id` (uuid PK), `seller_id` (FK → profiles), `category`, `title`, `property_type`, `price` (bigint)
- `description_id`, `description_en` (text)
- `address`, `city`, `district`, `certificate_status`
- `bedrooms`, `bathrooms`, `area_sqm` (bukan `sqm`)
- `image_url` (text — single URL or JSON.stringify([...]))
- `seller_whatsapp`, `status` ('pending'/'in_review'/'verified'/'rejected'/'sold'), `created_at`
- **TIDAK ada kolom** `agent_id`, `is_verified`, `gmaps_link` — mekanisme status murni via kolom `status`; penjual via `seller_id`.
- **Column naming**: `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`)

### Table `profiles`
- `id` (uuid PK, references auth.users), `first_name`, `email`, `whatsapp`, `role`, `created_at`
- Role values: `pembeli`, `owner`, `agent`, `developer`, `admin`
- **TIDAK ada kolom `updated_at`** (sudah dibuktikan bugfix: update payload tidak boleh menyertakan `updated_at`).
- Catatan: **tidak ada tabel `agents` terpisah** — "agen" = baris `profiles` dengan `role` = agent/developer/admin.

### Table `saved_properties`
- `id` (uuid PK), `user_id` (FK → profiles), `property_id` (FK → properties), `created_at`
- Unique constraint on `(user_id, property_id)`

### Table `audit_logs`
- `id`, `admin_id`, `admin_name`, `action_type`, `target_type`, `target_id`, `target_detail` (JSONB), `created_at`

### Table `direct_messages`
- `id`, `sender_id`, `receiver_id`, `content`, `created_at`

### Table `forum_posts`
- `id` (uuid PK), `author_id` (FK → profiles), `title`, `content`, `category` (text, default 'Umum'), `created_at`
- **Kolom tambahan (Aug 2026)**: `views` (int, default 0), `is_pinned` (bool, default false), `solved_reply_id` (uuid → forum_replies), `tags` (text[] default '{}'), `poll` (jsonb — `{ question, options[] }`)
- RLS: select all, insert/update/delete hanya author

### Table `forum_replies`
- `id` (uuid PK), `post_id` (FK → forum_posts), `author_id` (FK → profiles), `content` (support quoted reply format `<!--replyto:authorName|snippet-->`), `created_at`
- RLS: select all, insert/update/delete hanya author
- Realtime: INSERT on `forum_replies` (subscribe di ForumDetailPage)

### Table `forum_likes` (legacy — masih ada untuk kompatibilitas)
- `id` (uuid PK), `user_id` (FK → profiles), `target_id` (uuid — post or reply ID), `target_type` (text — 'post' or 'reply'), `created_at`
- Unique constraint on `(user_id, target_id, target_type)`
- RLS: select all, insert/delete only owner
- Migration `20260801_forum_enhancements.sql` **memindahkan data lama ke `forum_reactions`** sebagai 👍 (backward compat). Fitur baru pakai `forum_reactions`.

### Table `forum_reactions` (baru — menggantikan likes)
- `id` (uuid PK), `user_id` (FK → profiles, cascade), `target_id` (uuid — post or reply ID), `target_type` (text check 'post'/'reply'), `reaction` (text — emoji 👍❤️🔥💡), `created_at`
- Unique constraint on `(user_id, target_id, target_type)` — **satu reaksi per user per target**
- RLS: select all, insert/update/delete hanya owner

### Table `forum_poll_votes` (baru)
- `id` (uuid PK), `post_id` (FK → forum_posts, cascade), `user_id` (FK → profiles, cascade), `option_index` (int), `created_at`
- Unique constraint on `(post_id, user_id)` — satu vote per user per poll
- RLS: select all, insert/update/delete hanya owner

### Table `agent_applications` (baru)
- `id` (uuid PK), `full_name`, `email`, `whatsapp` (not null), `agency`, `experience`, `region`, `portfolio` (text, default '')
- `agreement_accepted_at` (timestamptz), `status` (check 'pending'/'approved'/'rejected', default 'pending'), `reject_reason` (text default ''), `reviewed_by` (FK → profiles), `reviewed_at`, `created_at`
- Index: `status`, `created_at`
- **RLS**: insert untuk semua (publik, `with check (true)`), select/update hanya admin
- **Trigger** `agent_approval_trigger` (after update status) → `handle_agent_approval()`: saat approved, update `profiles.role='agent'` untuk profil yang emailnya sama (role lama pembeli/owner, bukan admin)

### Table `site_visits`
- `id` (uuid PK), `property_id` (FK → properties), `buyer_id` (FK → profiles), `scheduled_date` (date), `scheduled_time` (time), `notes` (text, default ''), `status` (text, check: 'pending'/'confirmed'/'cancelled'/'completed'), `created_at`
- RLS: user hanya bisa select/insert milik sendiri, dan update hanya ke status 'cancelled'.

### Table `user_financial_profiles`
- `id` (uuid PK), `user_id` (uuid, FK → **auth.users**, unique), `monthly_income`, `monthly_commitments`, `monthly_budget` (numeric), `purchase_goal` (check: 'rumah_pertama'/'huni'/'investasi'/'sewa'/'belum_tahu'), `created_at`, `updated_at`
- RLS: hanya pemilik.

### Table `property_ai_analysis`
- `id` (uuid PK), `property_id` (uuid, unique FK → properties, on delete cascade), `analysis_data` (jsonb), `created_at`
- RLS: select/insert/update untuk semua (cache publik).
- Dipakai oleh InvestmentAnalyzer untuk cache hasil analisis AI per properti (30 hari + fingerprint preferensi investor).

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
- Dipanggil di ExplorePage, PropertyDetailPage, SellPropertyPage, KprCalculatorPage, NotFoundPage, **AgentApplicationPage**

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
- `useAuth()` → `{ session, user, loading, showToast, signOut, role }`. `signOut` via `handleLogout` dari App
- Color palette: `brand-primary` (#1E3A5F), `brand-accent` (#4A90E2), `brand-bg` (#F8FAFC), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#6B7280), `brand-border` (#E5E7EB), `brand-highlight` (#EDF4FD), `brand-verified` (#2E8B57), `brand-danger` (#DC2626)
- Logo: `public/huniOne.svg` via `<img>` (viewBox-based)
- Shared utils: `format.js` (formatPrice, formatCurrency, formatCount), `avatar.js` (getAvatarColor, getInitials), `time.js` (timeAgo), `favorites.js` (setSupabase, initFavorites, toggleFavorite), `images.js` (parseImages, FALLBACK_IMAGE, getImageSrc), `markdown.js` (parseBlocks, tokenizeInline, isSafeUrl), `compare.js` (MAX_ITEMS=3, getCompareList, addToCompare, removeFromCompare, isInCompare, clearCompare), `recentlyViewed.js` (get/remove/clear/addRecentlyViewed, CHANGE_EVENT), `financialProfile.js` (getFinancialProfile, saveFinancialProfile, computeAffordability, maxAffordablePrice, estimateMonthlyInstallment, BUYING_POWER_ASSUMPTION)
- Custom events untuk integrasi antar komponen: `compare-updated`, `recently-viewed-changed`, `financial-profile-saved`, `open-financial-profile`, `open-hunibot-question`, `open-hunibot`
- Footer: mega footer (5 kolom) + newsletter (validasi email) + stats live (properties verified/profiles/forum_posts) + trust badges + app badges (App Store/Play Store → `/coming-soon`) + contact (WhatsApp `wa.me/6281234567890`, `halo@hunione.com`, tombol tanya HuniBot) + social links real + **scroll-to-top button** (muncul scrollY > 400)

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
9. `20260801_forum_enhancements.sql` — kolom baru forum_posts (views/is_pinned/solved_reply_id/tags/poll) + tabel `forum_reactions` + `forum_poll_votes` + migrasi data forum_likes → reactions
10. `20260801_create_agent_applications.sql` — tabel `agent_applications` + RLS + trigger approval role promotion

**Catatan**: PostgreSQL 14 tidak support `CREATE POLICY IF NOT EXISTS` — harus pakai `DROP POLICY IF EXISTS` dulu sebelum `CREATE POLICY`. Migration terbaru memakai blok `do $$ ... exception when duplicate_object` untuk idempotency.
