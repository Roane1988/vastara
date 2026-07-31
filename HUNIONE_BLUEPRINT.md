# HuniOne — Blueprint Lengkap Proyek (untuk Gemini AI)

Dokumen referensi menyeluruh untuk memahami seluruh internal proyek **HuniOne** (kode nama: `projectVastara`) — platform marketplace properti Indonesia (jual/beli/sewa) dengan forum komunitas, AI chatbot, kalkulator KPR, analisis investasi AI, realtime chat, dan admin dashboard. Ditulis agar AI lain (mis. Gemini) bisa langsung mengerjakan/refactor/menambah fitur tanpa menebak-nebak.

Deploy: **Vercel** (SPA + serverless functions) — domain **hunione.com**. Backend: **Supabase** (Postgres + Auth + Storage + Realtime + RLS).

---

## 1. Tech Stack & Scripts

| Area | Teknologi |
|---|---|
| Framework | React 19 (JSX, JavaScript murni — **tanpa TypeScript**) + Vite 8 |
| Styling | Tailwind CSS v4 — config via CSS `@theme` di `src/index.css`, **tidak ada** `tailwind.config.js` |
| Routing | react-router-dom v7 (API sama dengan v6) |
| Auth/DB/Realtime/Storage | Supabase (`@supabase/supabase-js` v2) |
| AI | Groq API (`llama-3.3-70b-versatile`) via proxy `/api/groq` |
| Icons | lucide-react |
| Animasi | framer-motion |
| i18n | i18next + react-i18next (ID/EN) |
| Lain | lru-cache (rate limit in-memory), @google/generative-ai (dependency tak terpakai) |

**Scripts (`package.json`):**
- `npm run dev` → Vite dev server (dengan proxy `/api/groq` inline)
- `npm run build` → Vite build ke `dist/`
- `npm run lint` → ESLint (`eslint.config.js`)
- `npm run preview` → preview build

---

## 2. Struktur Folder `src/`

```
src/
├── App.jsx                      # Root: routing + layout global
├── main.jsx                     # Entry (i18n + StrictMode + index.css)
├── i18n.js                      # i18next init (id default, fallback en)
├── index.css                    # Tailwind v4 @theme (palette brand-*) + keyframes
├── supabaseClient.js            # createClient + validasi env
├── context/AuthContext.jsx      # session/user/role + showToast + signOut
├── hooks/
│   ├── useGroqTranslation.js    # dynamic EN translation via Groq (cache + batch)
│   └── useSEO.js                # set title/meta/OG tags
├── data/dummyProperties.js      # fallback data properti
├── utils/
│   ├── images.js                # parseImages/getImageSrc/FALLBACK_IMAGE
│   ├── format.js                # formatPrice/formatCurrency/formatShort
│   ├── avatar.js                # getAvatarColor/getInitials
│   ├── time.js                  # timeAgo (Indonesian relative time)
│   ├── favorites.js             # localStorage + sync ke saved_properties
│   ├── recentlyViewed.js        # localStorage riwayat lihat
│   ├── compare.js               # localStorage keranjang banding (MAX_ITEMS=3)
│   └── financialProfile.js      # CRUD profil keuangan + rumus affordability
├── locales/{id,en}/translation.json
└── components/                  # ±33 halaman/komponen (lihat bagian Fitur)
```

Root lain: `api/groq.js` (serverless), `vercel.json`, `vite.config.js`, `supabase/migrations/*.sql`, `supabase/seed_properties.sql`.

---

## 3. Routing (`src/App.jsx`)

Semua halaman di-load dengan `React.lazy()` + `<Suspense>` (PageLoader spinner). Layout: `<TopNavbar>` → `<AnimatePresence mode="wait">` (page transition framer-motion) → `<Routes>` → `<Footer>`, plus `<ProfileDrawer>` dan `<HuniBot>` global.

| Path | Komponen | Guard |
|---|---|---|
| `/`, `/explore` | ExplorePage | – |
| `/login` | MinimalistLogin | – |
| `/sell-role` | RoleSelectionPage | `ProtectedRoute` (harus login) |
| `/sell` | SellPropertyPage | `ProtectedRoute` (support `?edit=ID`) |
| `/my-listings` | MyListingsPage | `ProtectedRoute` |
| `/chat` | ChatHubPage | `ProtectedRoute` |
| `/forum`, `/forum/:id` | ForumPage, ForumDetailPage | – |
| `/property/:id` | PropertyDetailPage | – |
| `/admin` | AdminDashboardPage | `AdminRoute` (login + role==='admin') |
| `/kpr` | KprCalculatorPage | – |
| `/compare` | ComparePage | – |
| `/coming-soon` | ComingSoonPage | – |
| `*` | NotFoundPage | – |

- `ProtectedRoute`: redirect ke `/login` dengan `state.from` untuk redirect balik.
- `AdminRoute`: redirect ke `/` jika `role !== 'admin'`.

---

## 4. Theming (`src/index.css`)

Tailwind v4 didefinisikan via `@theme`. **Jangan** menambah `tailwind.config.js`. Palette:

```
brand-primary: #1E3A5F    brand-accent: #4A90E2    brand-bg: #F8FAFC
brand-surface: #FFFFFF    brand-text: #1C2733      brand-muted: #6B7280
brand-border: #E5E7EB     brand-highlight: #EDF4FD  brand-verified: #2E8B57
brand-verified-bg: #EAF7EF brand-pending: #F59E0B   brand-sold: #9CA3AF
brand-promo: #4A90E2      brand-danger: #DC2626
```

Custom utilities: `.no-scrollbar`. Keyframes: `slide-up`, `fadeIn`. Konten desktop dibatasi `max-w-7xl mx-auto` (meniru Rumah123).

---

## 5. Data Layer — Supabase

Env yang dibutuhkan (client): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Env server (Vercel): `GROQ_API_KEY`.

### Tabel

**`profiles`** — `id` (PK, ref auth.users), `first_name`, `email`, `whatsapp`, `role`, `created_at`, `updated_at`. Role: `pembeli | owner | agent | developer | admin`. RLS: select semua, insert/update/delete hanya pemilik; **update tidak boleh set role jadi `admin`** (kecuali admin) — dijaga `WITH CHECK (role IS DISTINCT FROM 'admin')`.

**`properties`** — `id`, `seller_id` (FK profiles), `category` ('Dijual'/'Disewa'), `title`, `property_type`, `price` (bigint), `description_id`, `description_en`, `address`, `city`, `district`, `certificate_status`, `bedrooms`, `bathrooms`, `area_sqm` (**bukan** `sqm`), `image_url` (TEXT — single URL **atau** `JSON.stringify([...])`), `seller_whatsapp` (**bukan** `agent_whatsapp`), `status` ('pending'/'verified'/'rejected'), `created_at`. RLS: publik hanya lihat `verified`; seller lihat punya sendiri (termasuk pending); admin lihat semua; insert/update/delete hanya seller sendiri; admin boleh update semua.

**`saved_properties`** — `id`, `user_id` (FK profiles), `property_id` (FK properties), `created_at`; unique `(user_id, property_id)`. RLS: hanya pemilik.

**`audit_logs`** — `id`, `admin_id`, `admin_name`, `action_type` (`verify_property`/`reject_property`/`change_role`), `target_type` (`property`/`user`), `target_id`, `target_detail` (JSONB), `created_at`. RLS: select admin only, insert authenticated.

**`direct_messages`** — `id`, `sender_id`, `receiver_id`, `content`, `created_at`. RLS: select bila sender/receiver, insert bila sender. Realtime INSERT harus di-enable manual di dashboard.

**`forum_posts`** — `id`, `author_id`, `title`, `content`, `category` (default 'Umum'), `created_at`.

**`forum_replies`** — `id`, `post_id`, `author_id`, `content` (mendukung format quote `<!--replyto:authorName|snippet-->`), `created_at`. Realtime INSERT di-subscribe ForumDetailPage.

**`forum_likes`** — `id`, `user_id`, `target_id` (post **atau** reply), `target_type` ('post'/'reply'), `created_at`; unique `(user_id, target_id, target_type)`.

**`site_visits`** — `id`, `property_id`, `buyer_id`, `scheduled_date`, `scheduled_time`, `notes`, `status` ('pending'/'confirmed'/'cancelled'/'completed'), `created_at`. (Fitur booking survei — dipakai ScheduleVisit.)

**`user_financial_profiles`** — `id`, `user_id` (unique), `monthly_income`, `monthly_commitments`, `monthly_budget` (numeric), `purchase_goal` (enum: `rumah_pertama/huni/investasi/sewa/belum_tahu`), `created_at`, `updated_at`. RLS: hanya pemilik.

### Storage bucket `PROPERTIES_IMAGE`
Upload gambar properti (SellPropertyPage). Path: `{userId}-{timestamp}-{sanitizedFileName}`. Public URL via `getPublicUrl()`. Multi-image disimpan sebagai `JSON.stringify(urls)`. Butuh RLS: INSERT authenticated, SELECT public.

### Catatan migrations
Semua file di `supabase/migrations/`. **PostgreSQL 14 tidak support `CREATE POLICY IF NOT EXISTS`** → gunakan `DROP POLICY IF EXISTS` dulu, atau blok `do $$ ... exception when duplicate_object then null; end $$`. Semua migration sudah dieksekusi di dashboard (termasuk `user_financial_profiles` dan `site_visits`). `supabase/seed_properties.sql` = data uji berstatus `verified` (image_url berbentuk JSON array literal).

---

## 6. Auth (`src/context/AuthContext.jsx`)

- `useAuth()` mengembalikan `{ session, user, role, loading, showToast, signOut }`.
- `user` bisa `null`; untuk cek login gunakan `session?.user` (lebih stabil).
- `signOut` dipanggil lewat `handleLogout` di App (jangan panggil `supabase.auth.signOut()` langsung di komponen).
- `showToast(message, type)` → global Toast (success/error/info, auto-dismiss 4s).
- Login: email/password + Google OAuth (`supabase.auth.signInWithOAuth`).
- `role` di-fetch dari `profiles` saat mount & tiap auth state change; `initFavorites(userId)` disinkronkan juga.

---

## 7. Local Storage Keys

| Key | Isi | Dipakai |
|---|---|---|
| `vastara_compare` | array `{id,title,price,image_url}` | CompareBar/ComparePage (MAX 3) |
| `vastara_favorites` | array id | utils/favorites (gabung dengan DB `saved_properties`) |
| `vastara_recently_viewed` | array properti (MAX 10) | RecentlyViewed di ExplorePage |
| draft iklan `sellDraft*` | draft form jual | SellPropertyPage (autosave) |

---

## 8. AI / Groq — `/api/groq` (serverless) & `vite.config.js` (dev proxy)

Dua implementasi identik (serverless `api/groq.js` untuk production, middleware `vite.config.js` untuk dev). Keduanya membaca `GROQ_API_KEY` server-side.

**Keamanan & limit:**
- Rate limit: 20 req/menit/IP (LRUCache in-memory, max 500 entries).
- Session limit (non-investment): 50 pesan/IP/jam.
- Model: hanya `llama-3.3-70b-versatile` (403 selain itu).
- Body validation: max 20 messages, tiap content max 10.000 chars.
- `BLOCKED_PATTERNS` (prompt injection): `ignore previous instructions`, `you are now/free`, `jailbreak`. **CATATAN:** pola `DAN` dihapus karena bentrok dengan kata "dan" bahasa Indonesia.
- `SUSPICIOUS_INPUT`: null bytes, control chars, `<script>`, `data:text/html`, `vbscript:`.
- Output guard: `<script>`, `javascript:(`, `data:text/html` diganti `[diblokir]`.
- Audit ring buffer in-memory (1000 entries).

**Purpose-based system prompt** (`req.body.purpose`):
- `chat` → HuniBot (Indonesia, properti/KPR/investasi/hukum, maks 2-3 paragraf). temp 0.7, max_tokens 1024.
- `translation` → translator ID→EN, JSON-only, no markdown. temp 0.3, max_tokens 2048.
- `smart_search` → ekstrak `{city, category, propertyType, maxPrice, minPrice, bedrooms, bathrooms, keyword}` dari bahasa alami. Satuan harga: M/Miliar/Milyar=1e9, Jt/Juta=1e6, Ribu=1e3. temp 0.1, max_tokens 512.
- `investment` → analis keuangan properti. Keluaran JSON: `{estimatedRentalYield, monthlyRentalEstimate, targetMarket, appreciationPotential, pricePerSqm, breakEvenYears, riskLevel, comparableCount, verdict}`. temp 0.2, max_tokens 1536. Body memakai `property` object (bukan messages) + optional `comparables`.

**Anti prompt injection:** client `system` role selalu di-strip; ada `guard` system message; khusus `chat`, system message ber-prefix `HUNIONE_PROFILE:` dipindahkan ke posisi terakhir (konteks profil keuangan user).

**CORS (`vercel.json`):** API hanya boleh diakses dari `https://hunione.com`. Security headers: CSP ketat (img dari supabase.co + images.unsplash.com; connect ke supabase.co/wss + accounts.google.com), `X-Frame-Options: SAMEORIGIN`, dll.

---

## 9. Fitur Utama (per komponen)

### ExplorePage (`/`, `/explore`)
Home: hero banner, search bar, tab filter (Dijual/Disewa/Baru — filter `.eq('category')`), filter drawer server-side, grid properti, rekomendasi, **RecentlyViewed**, **CompareBar**. Poin penting:
- Hanya tampilkan `status === 'verified'`.
- **Smart search AI**: tombol cari mengirim `purpose:'smart_search'` ke `/api/groq`, hasil JSON dipakai membangun query Supabase (kota/kategori/harga/RT/KM/keyword).
- **Compare checkbox**: tiap kartu punya toggle "Bandingkan" → `addToCompare`/`removeFromCompare` → dispatch event `compare-updated`.
- Thumbnail pakai `getImageSrc(p.image_url)` + `onError` fallback.
- Dynamic EN translation via `batchTranslate()` saat `lang === 'en'` (`getTranslated(prop, field, fallback)`).

### PropertyDetailPage (`/property/:id`)
- Gallery: `GalleryDesktop` (grid ala Airbnb, `lg:block`) + `GalleryMobile` (hero aspect-[4/3] + 4-thumb, overlay "Lihat Semua" jika >5) + Lightbox fullscreen (Escape/panah, body scroll lock).
- 2 kolom (desktop): kiri = judul/harga/spesifikasi/deskripsi/`KprSimulator`/accordion; kanan = **AgentCard** sticky (`sticky top-24`).
- AgentCard: avatar inisial + warna hash dari `seller_id`, nama/role dari join `profiles`.
- Mobile: **floating WhatsApp bar** pintar (IntersectionObserver pada AgentCard, sembunyi saat kartu terlihat) + CTA "Hubungi Pengiklan Segera" (`bg-red-50`).
- Accordion: "Panduan Membeli Properti" + "Disclaimer".
- EN: `useGroqTranslation` untuk title/address/type; `description_en` dipakai langsung jika ada.
- "Properti Serupa": 6 item, filter kategori/kota, exclude id, status verified.

### SellPropertyPage (`/sell`, `?edit=ID`) — 3 step
- Step 0 Info: kategori, tipe, judul, harga, KT/KM/sqm, sertifikat, deskripsi + tombol **Saran AI** (Groq), alamat/kota/kecamatan.
- Step 1 Foto & Lokasi: drag-and-drop reorder, max 10 foto max 5MB (JPG/PNG/WEBP/AVIF), upload paralel `Promise.all()` ke `PROPERTIES_IMAGE`, `image_url` = `JSON.stringify(urls)`.
- Step 2 Review & Kirim: PreviewCard + input WhatsApp.
- Draft autosave localStorage, guard `beforeunload`, cleanup `URL.revokeObjectURL`.
- Submit insert dengan `status:'pending'` (wajib — SOP verifikasi admin). Edit mode → `.update()`.

### MyListingsPage
Daftar properti milik user (`seller_id`), badge status, tombol Edit & Tandai Terjual.

### CompareBar + ComparePage
- **CompareBar** (bottom floating bar, mounted di ExplorePage): thumbnail properti, counter `x/3`, tombol hapus per item, tombol "Bandingkan" → `/compare`. Update via event `compare-updated` + `storage`.
- **ComparePage** (`/compare`): fetch data lengkap (dummy + Supabase `.in('id',...)`), tabel perbandingan (harga, tipe, KT/KM, luas, kota, alamat, sertifikat), hapus per kolom, "Hapus Semua", empty state.
- **BUG yang sudah diidentifikasi (belum diperbaiki — di-revert):** CompareBar memakai `p.image_url` langsung sebagai `<img src>` padahal bisa string JSON array → harus `getImageSrc()` + `onError` fallback. ComparePage juga perlu listener `compare-updated`/`storage` agar state tidak basi (saat ini hanya snapshot di `useEffect` mount).

### ForumPage + ForumDetailPage
- Post cards: avatar inisial + warna hash, badge kategori warna-warni (Umum/KPR/Legalitas/Tips Properti/Rekomendasi), search + filter kategori, compose dengan kategori, edit inline, delete pakai ConfirmModal, cancel-confirmation.
- Detail: like/upvote (`forum_likes`, polymorphic), quote reply (`<!--replyto:authorName|snippet-->`), edit post/reply inline, realtime INSERT `forum_replies`, auto-scroll, relative time (`timeAgo`), success toast, guest CTA.

### ChatHubPage (`/chat`) — Realtime DM
Two-column: contact list (kiri) + chat window (kanan); mobile toggle. Contact = counterparty dari `direct_messages` + profile role agent/developer/admin. Realtime subscription channel `direct-messages-{userId}` dengan filter `or(sender_id.eq...,receiver_id.eq...)`. Bubbles (own = brand-primary, received = white), auto scroll, Enter kirim, LoginPrompt jika belum login.

### AdminDashboardPage + AdminAnalyticsCards + AdminUserManagement + AdminAuditLog (`/admin`)
- 3 tab: Overview / Users / Audit (tab bar sticky, underline indicator).
- Overview: 4 metric cards (Verified/Menunggu/Pengguna/Agen+Dev) + tabel properti dengan preview modal, filter status, bulk verify, pagination 10/halaman, search, realtime (INSERT/UPDATE), soft reject + restore, thumbnail.
- Users: tabel profil, inline `<select>` ganti role → insert `audit_logs`, badge "Anda".
- Audit: 100 entri terakhir, badge warna per `action_type`, summary dari `target_detail` JSONB.
- Setiap verify/reject/change_role → `insertAuditLog()` fire-and-forget.

### KPR (KprSimulator + KprCalculatorPage)
- Rumus anuitas standar: `M = P*i*(1+i)^n / ((1+i)^n - 1)`. Edge: bunga 0% → bagi langsung; pokok ≤ 0 → "Lunas"; NaN → Rp 0.
- KprSimulator (widget reusable, dipasang di PropertyDetailPage): slider DP 0-50%, input % ↔ nominal 2 arah.
- KprCalculatorPage (`/kpr`): 2 kolom, DP 0-80%, tenor 5-25 tahun, tabel amortisasi (per tahun), biaya tambahan (BPHTB 5%, PPN 11%, Notaris 1%, Provisi 1%) + Total Dana Awal, tombol WhatsApp & konsultasi HuniBot.
- **Fitur pemula**: tombol "Belum paham istilah KPR?" → event `open-hunibot-question` (HuniBot membalas penjelasan sederhana); `InfoTooltip` di semua field (DP, suku bunga, tenor, amortisasi, biaya lain); penjelasan inline cicilan.
- **Panel affordability**: `FinancialProfileForm` → `computeAffordability` (30% take-home) → `maxAffordablePrice` menampilkan harga maksimal yang bisa dibeli.

### InvestmentAnalyzer (di PropertyDetailPage)
- Tombol "Analisis Prospek Investasi" → fetch comparables (8 properti verified, harga ±30%, kategori & kota sama via `ilike`) → kirim `purpose:'investment'` ke `/api/groq` → parse JSON (`cleanJson`).
- UI: ring skor animasi (framer-motion pathLength), label skor (Sangat Potensial/Potensial/Cukup/Kurang), 4 metric card (rendemen sewa, sewa/bulan, harga/m², break-even) dengan animasi CountUp, section Pasar & Pertumbuhan (target pasar, potensi kenaikan, badge risiko Rendah/Sedang/Tinggi), kesimpulan analis, disclaimer.

### FinancialProfileForm (di `/kpr` + ProfileDrawer)
Form pendapatan bulanan, cicilan/komitmen, budget cicilan, tujuan pembelian. Simpan via upsert ke `user_financial_profiles` (onConflict user_id). Saran "30% gaji bersih" dihitung live. Jika belum login → CTA ke `/login`. Jika sudah ada profil → prefill.

### HuniBot (global floating)
- Greeting personal (nama user) & quick replies; animated bubbles; route-aware hiding di `/kpr` (hanya tombol trigger disembunyikan, komponen tetap mounted).
- Event listeners: `open-hunibot` (buka), `open-hunibot-with-context` (dari KPR — sisipkan konteks harga/cicilan/tenor + cek profil keuangan), `open-hunibot-question` (kirim pertanyaan tertentu).
- Mengirim `purpose:'chat'` + `HUNIONE_PROFILE:` context (dari `formatProfileContext`) saat profil ada.
- Rate limit client-side `RATE_LIMIT_MS` (spam guard), scroll-to-bottom, tombol scroll top di dalam chat.

### Others
- **RecentlyViewed**: horizontal scroll kartu properti yang pernah dibuka.
- **MoreCategoriesDrawer**: bottom sheet kategori, swipe-to-close via `useDragControls` framer-motion (`drag="y"`, offset >100 atau velocity >300).
- **RescheduleBottomSheet / ScheduleVisit**: booking & ubah jadwal survei (pakai `site_visits`).
- **HamburgerMenu / ProfileDrawer / NotificationDrawer**: drawer navigasi, profil (edit + profil keuangan + saved + logout), notifikasi. Role admin → item "Dashboard Admin" + badge "Admin Internal".
- **Toast / ConfirmModal / ErrorBoundary**: notifikasi global, konfirmasi destruktif (framer-motion), error boundary (reload button).
- **NotFoundPage / ComingSoonPage**: fallback.

---

## 10. i18n & Dynamic Translation

- `src/i18n.js`: i18next init, `lng:'id'`, `fallbackLng:'en'`, resource dari `locales/{id,en}/translation.json` (±238 baris masing-masing).
- **Dynamic EN translation via Groq** (`src/hooks/useGroqTranslation.js`):
  - Module-level `cache` Map + `inflight` Map untuk dedup request.
  - `useGroqTranslation(propertyId, fields)` → `{ translated, loading, getText(field, fallback) }` untuk PropertyDetailPage.
  - `batchTranslate(properties, signal)` → satu POST `/api/groq` untuk semua teks belum ter-cache (ExplorePage).
- Teks terjemahan **tidak disimpan ke DB** saat dynamic (kecuali `description_en` yang diisi seller).

---

## 11. Konvensi & Pola Kode (PENTING untuk AI)

1. **ESLint (React 19):** `react-hooks/set-state-in-effect` & `react-hooks/static-components` aktif. Jangan buat komponen di dalam render — ekstrak ke komponen standalone lalu pakai JSX `<Comp />` (bukan `{Comp()}`). Jika terpaksa `setState` di effect, tambah `// eslint-disable-next-line react-hooks/set-state-in-effect`.
2. **Setiap async effect** harus punya `cancelled` flag / `cancelledRef` + cleanup, dan setiap Supabase call dibungkus `try/catch`. Untuk count query pakai `select('*', { count: 'exact', head: true })`.
3. **Semua `<img>` dari DB** wajib `onError` → `FALLBACK_IMAGE` (`utils/images.js`). Untuk thumbnail pakai `getImageSrc(image_url)`.
4. **Nama kolom yang benar:** `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`). Boleh pakai fallback `??` untuk backward compat.
5. **RBAC:** cek `role === 'admin'` untuk fitur admin. Ambil `role` dari `profiles` saat dibutuhkan (jangan hardcode).
6. **Audit logging:** setiap aksi admin (verify/reject/change_role) → insert `audit_logs` fire-and-forget.
7. **SOP verifikasi properti:** seller upload → `status:'pending'` → admin verify → `'verified'` (muncul publik) / reject → hapus dari DB.
8. **Event-driven sync antar komponen:** gunakan `window.dispatchEvent(new Event('compare-updated'))` + listener, atau CustomEvent `open-hunibot-*`.
9. **Nav aman:** `window.history.length > 1 ? navigate(-1) : navigate('/')`.
10. **Format uang:** `formatPrice` (Rp M/Jt) atau `formatCurrency` (Intl IDR) dari `utils/format.js`.
11. **i18n:** string UI lewat `t('key')`; jangan hardcode bahasa.

---

## 12. Deploy (Vercel)

- Auto-deploy dari push ke `main` (git remote origin). Vercel Framework: Vite → build `npm run build`, output `dist/`.
- `vercel.json`: SPA rewrite `/(.*)` → `/index.html`, API rewrite `/api/(.*)` → `/api/groq`, security headers + CORS (hanya `https://hunione.com`).
- Env di Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GROQ_API_KEY`.
- **Build chunk >500KB warning** (index ~682KB) — aman, hanya warning. Code-splitting via lazy routes sudah diterapkan.

---

## 13. Status Terkini & Catatan

- Semua fitur AI (smart search, investment analyzer, financial profile, tooltips KPR, beginner KPR) sudah selesai & di-push ke `main`.
- **Compare feature sedang dikerjakan** (belum fix): bug gambar hitam di CompareBar + state ComparePage yang tidak reaktif. Perbaikan pernah ditulis lalu di-revert oleh user — file saat ini kembali ke kondisi `main` (`a05a336`).
- Working tree saat ini: bersih (`git status` clean) — selain `ComparePage.jsx` yang baru saja diperbaiki masalah reactivity-nya (belum di-commit).
- **Jangan commit/push tanpa instruksi eksplisit** — pola user: "git commit -m ... dan git push".
- `dist/` adalah artefak build yang di-gitignore; hapus manual saat user minta "bersihkan".
- Proyek dalam bahasa Indonesia (UI, komentar, prompt AI), kode/bonus identitas git default `roane@satrias-MacBook-Air.local`.
