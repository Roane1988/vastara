# HuniOne — Dokumentasi Arsitektur Teknis Lengkap

**Versi**: 1.0.0
**Tanggal**: 1 Agustus 2026
**Commit terakhir**: `f2d8779` (feat(kpr): enhance KPR simulator)
**Deploy**: Vercel (SPA + serverless function) — domain **hunione.com**
**Repo**: `github.com/Roane1988/vastara`

---

## 1. Ringkasan Proyek

**HuniOne** (sebelumnya bernama Vastara) adalah platform properti all-in-one untuk **jual, beli, dan sewa** properti di Indonesia.

Fitur utama:
- Jelajah & cari properti (server-side filter via Supabase)
- Detail properti dengan galeri multi-gambar, lightbox, kartu agen, KPR simulator
- Iklankan properti (multi-step form, upload foto, AI description)
- Favorit (tersimpan), Terakhir Dilihat, Bandingkan properti (max 3)
- Kalkulator KPR lengkap (amortisasi, biaya lainnya, affordability)
- Analisis investasi AI per properti
- Profil keuangan (income → daya beli / cicilan aman)
- Forum diskusi komunitas (post, reply, like, quote, kategori, realtime)
- Chat realtime direct messaging antar pengguna
- AI chatbot **HuniBot** (jawab pertanyaan properti/KPR/legal dengan konteks profil finansial)
- Dynamic translation ID→EN via AI (Groq)
- Admin dashboard (analytics, manajemen user, audit trail, verifikasi properti)
- Jadwal survei properti (site visits)
- i18n ID/EN

## 2. Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 (ESM, JSX) |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS v4 — config via CSS `@theme` di `src/index.css`, **tidak ada** `tailwind.config.js` |
| Database/Auth/Storage/Realtime | Supabase (Postgres + RLS + Auth + Storage + Realtime) |
| Icons | lucide-react |
| Animasi | framer-motion |
| i18n | i18next + react-i18next (id/en) |
| AI (chatbot + translation + investment analysis) | Groq API via proxy `api/groq.js` (model chain: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`) |
| Rate limiting | lru-cache (in-memory, Vercel serverless) |

**Catatan penting Tailwind v4**: tidak ada `tailwind.config.js`. Warna custom didefinisikan di `src/index.css`:
```
--color-brand-primary: #1E3A5F   (navy tua — header, tombol utama)
--color-brand-accent:  #4A90E2   (biru — CTA)
--color-brand-bg:      #F8FAFC   (background halaman)
--color-brand-surface: #FFFFFF
--color-brand-text:    #1C2733
--color-brand-muted:   #6B7280
--color-brand-border:  #E5E7EB
--color-brand-highlight:#EDF4FD
--color-brand-verified:#2E8B57   (hijau — badge terverifikasi)
--color-brand-verified-bg:#EAF7EF
--color-brand-pending: #F59E0B   (amber)
--color-brand-sold:    #9CA3AF
--color-brand-promo:   #4A90E2
--color-brand-danger:  #DC2626   (merah — aksi destruktif)
```
Custom keyframes di `index.css`: `slide-up`, `fadeIn`, `page-in` (dipakai untuk transisi halaman — `animate-page-in` di `App.jsx`). Utility `.no-scrollbar`.

## 3. Struktur Folder

```
/ (root)
├── api/groq.js                    ← Vercel serverless function (satu-satunya API)
├── src/
│   ├── main.jsx                   ← entry: import i18n, render App
│   ├── App.jsx                    ← routing + layout shell (navbar/footer/drawer/hunibot)
│   ├── i18n.js                    ← konfigurasi i18next (lng default 'id', fallback 'en')
│   ├── supabaseClient.js          ← init Supabase client dari env VITE_SUPABASE_*
│   ├── index.css                  ← Tailwind v4 theme + keyframes
│   ├── assets/                    ← fonts, hero.png, logo
│   ├── components/                ← 40 komponen (pages + UI + widgets)
│   ├── context/AuthContext.jsx    ← global auth state + toast
│   ├── data/dummyProperties.js    ← fallback data properti (id diawali "dummy-")
│   ├── hooks/                     ← useSEO, useGroqTranslation,
│   │                                  useChatUnread, usePrefersReducedMotion
│   ├── locales/id/translation.json
│   ├── locales/en/translation.json
│   └── utils/                     ← compare, favorites, recentlyViewed, financialProfile,
│                                     format, images, avatar, time
├── supabase/
│   ├── migrations/                ← 11 file SQL (DDL + RLS)
│   └── seed_properties.sql        ← 13 properti sample (status verified)
├── vercel.json                    ← SPA rewrite + security headers + CORS
├── vite.config.js                 ← dev proxy /api/groq + vendor chunk splitting
├── .env.local                     ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└── public/                        ← huniOne.svg, favicon_hunione.jpeg
```

## 4. Routing & Layout (`src/App.jsx`)

Semua halaman di-lazy-load (`React.lazy`) dibungkus `<Suspense fallback={<PageLoader/>}>`. Layout: `TopNavbar` (sticky) → konten ber-`animate-page-in` → `Footer` → `ProfileDrawer` (lazy) + `HuniBot` (lazy, selalu mounted). Semua dibungkus `<ErrorBoundary>` dan `<AuthProvider>`.

| Path | Komponen | Auth |
|---|---|---|
| `/`, `/explore` | ExplorePage | Tidak |
| `/login` | MinimalistLogin | Tidak |
| `/sell-role` | RoleSelectionPage | **Ya** (`ProtectedRoute`) |
| `/sell` | SellPropertyPage (mendukung `?edit=id`) | **Ya** |
| `/my-listings` | MyListingsPage | **Ya** |
| `/chat` | ChatHubPage | **Ya** (guard di dalam komponen juga) |
| `/forum` | ForumPage | Tidak |
| `/forum/:id` | ForumDetailPage | Tidak |
| `/property/:id` | PropertyDetailPage | Tidak |
| `/admin` | AdminDashboardPage (`AdminRoute`: hanya role admin) | **Ya + admin** |
| `/coming-soon` | ComingSoonPage | Tidak |
| `/kpr` | KprCalculatorPage | Tidak |
| `/compare` | ComparePage | Tidak |
| `/404`, `*` | NotFoundPage | Tidak |

- `ProtectedRoute`: redirect ke `/login` dengan `state.from` = pathname (untuk redirect balik).
- `AdminRoute`: redirect ke `/` jika `role !== 'admin'`.
- App mendengarkan custom event `open-financial-profile` → membuka `ProfileDrawer`.

## 5. Custom Event System (kunci integrasi antar komponen)

Komponen berkomunikasi lintas-halaman via `window` events (bukan context) — ini pola penting:

| Event | Dispatch oleh | Listen oleh |
|---|---|---|
| `compare-updated` | ComparePage, CompareBar, ExplorePage, RecentlyViewed | CompareBar, ComparePage, RecentlyViewed |
| `financial-profile-saved` | FinancialProfileForm | ComparePage |
| `open-financial-profile` | ComparePage, InvestmentAnalyzer | App.jsx, ProfileDrawer |
| `open-hunibot` | (belum ada dispatcher) | HuniBot |
| `open-hunibot-with-context` | KprCalculatorPage (detail: propertyPrice, dpAmount, dpPercentage, loanAmount, monthlyInstallment, interestRate, tenorYears) | HuniBot |
| `open-hunibot-question` | KprCalculatorPage, KprSimulator (detail: question) | HuniBot |
| `recently-viewed-changed` | utils/recentlyViewed.js | RecentlyViewed |

## 6. localStorage Keys

| Key | Isi | Dipakai |
|---|---|---|
| `hunione_favorites` | array id properti favorit | utils/favorites.js (migrasi otomatis dari legacy `vastara_favorites`) |
| `vastara_compare` | array `{id,title,price,image_url}` max 3 | utils/compare.js |
| `vastara_recently_viewed` | array properti (max 10) + `viewed_at` | utils/recentlyViewed.js |
| `vastara_translation_cache_v1` | cache terjemahan EN (max 300 entri) | useGroqTranslation.js |
| `huniOne_last_chat_read` | timestamp watermark "chat terakhir dibaca" | useChatUnread.js |
| `vastara_fin_profile_banner_dismissed` | dismiss banner profil finansial | (dipakai di flow profil) |
| draft form jual | autosave draft `SellPropertyPage` | SellPropertyPage |

## 7. Database Supabase

Migrations di `supabase/migrations/` (11 file). Semua query pakai RLS.

| Tabel | Kolom penting / catatan | RLS |
|---|---|---|
| **`profiles`** | `id` (FK auth.users), `first_name`, `email`, `whatsapp`, `role` (pembeli/owner/agent/developer/admin), `created_at`. **Tidak ada** `updated_at`. Tidak ada tabel `agents` terpisah — "agen" = `profiles` dgn role agent/developer/admin | select semua; insert/update/delete owner |
| **`properties`** | `seller_id` (FK profiles), `category`, `property_type`, `title`, `price` (bigint), `description_id`, `description_en` (TEXT), `address`, `city`, `district`, `certificate_status`, `bedrooms`, `bathrooms`, `area_sqm` (**bukan** sqm), `image_url` (TEXT: single URL legacy ATAU `JSON.stringify([...])`), `seller_whatsapp`, `status` (pending/in_review/verified/rejected/sold), `created_at`. **Tidak ada** `agent_id`, `is_verified`, `gmaps_link` | select semua; insert/update/delete seller |
| **`forum_posts`** | `author_id`, `title`, `content`, `category` (default 'Umum'), `created_at` | select semua; insert/update/delete author |
| **`forum_replies`** | `post_id`, `author_id`, `content` (mendukung quote `<!--replyto:author|snippet-->`), `created_at`. Realtime INSERT di-subscribe ForumDetailPage | select semua; insert/update/delete author |
| **`forum_likes`** | `user_id`, `target_id`, `target_type` ('post'/'reply'), unique (user_id,target_id,target_type) | select semua; insert/delete owner |
| **`direct_messages`** | `sender_id`, `receiver_id`, `content`, `created_at`. Realtime harus di-enable manual di dashboard (INSERT) | select bila sender/receiver; insert bila sender |
| **`saved_properties`** | `user_id`, `property_id`, unique (user_id,property_id) | owner only |
| **`audit_logs`** | `admin_id`, `admin_name`, `action_type` (verify_property/reject_property/change_role), `target_type`, `target_id`, `target_detail` (JSONB), `created_at` | select admin; insert authenticated |
| **`site_visits`** | `property_id`, `buyer_id`, `scheduled_date` (DATE), `scheduled_time` (TIME), `notes`, `status` (CHECK pending/confirmed/cancelled/completed) | select/insert owner; update hanya → cancelled |
| **`user_financial_profiles`** | `user_id` (**FK ke auth.users**, unique — bukan profiles.id), `monthly_income`, `monthly_commitments`, `monthly_budget` (NUMERIC), `purchase_goal` (CHECK), `created_at`, `updated_at` | owner only |
| **`property_ai_analysis`** | `property_id` (unique FK, on delete cascade), `analysis_data` (JSONB: `{fp, response}`), `created_at` — cache hasil AI investment 30 hari | public cache |

**Storage bucket**: `PROPERTIES_IMAGE` — path `{userId}-{timestamp}-{sanitizedName}`, public URL via `getPublicUrl()`.

**Storage RLS note**: perlu policy INSERT (authenticated) + SELECT (public) supaya upload & tampil gambar jalan.

## 8. Backend & Konfigurasi Deploy

### `api/groq.js` (Vercel Serverless — satu-satunya endpoint `/api/groq`)
- POST-only. Proxy ke `https://api.groq.com/openai/v1/chat/completions` dgn `GROQ_API_KEY` (server-only).
- **Keamanan**: rate limit per-IP 20 req/menit (lru-cache), limit 20 pesan/request & 50 pesan/sesi/jam, allowlist model, validasi body (role/content max 10.000 char), block pattern prompt-injection (`BLOCKED_PATTERNS`), sanitasi input mencurigakan & output (`[diblokir]`), strip `system` role dari client.
- **Purpose-based system prompt**: `chat`, `translation`, `smart_search`, `investment` → `SYSTEM_PROMPTS` map.
- **Model failover**: `MODEL_CHAINS` per purpose (fallback antar model).
- **Investment cache**: fingerprint `financialProfile + investmentGoals` → baca/tulis `property_ai_analysis` (30 hari, `CACHE_VERSION`).
- **Konfigurasi per purpose**: translation 1200 tok / temp 0.3; smart_search 512 / 0.1; investment 3000 / 0.2 + `response_format json_object`; chat 768 / 0.7.
- Audit log in-memory (max 1000) untuk rate_limited/session_limited/cache_hit/completed/failed.

### `vercel.json`
- Rewrite `/api/(.*)` → `/api/groq`; `/(.*)` → `/index.html` (SPA fallback).
- Security headers: `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP (self + unsafe-inline script/style, img dari *.supabase.co & images.unsplash.com, connect ke supabase/google), Permissions-Policy.
- CORS `/api/*`: origin `https://hunione.com`, methods GET/POST/OPTIONS, credentials true.

### `vite.config.js`
- **Kritis**: berisi duplikasi lengkap logika `api/groq.js` sebagai middleware dev (`groq-proxy`) di `/api/groq`, supaya endpoint sama jalan di lokal. **Harus dijaga sinkron** dengan `api/groq.js`.
- `manualChunks`: `vendor-react`, `vendor-supabase`, `vendor-i18n`.
- Membaca `GROQ_API_KEY` via `loadEnv`.

## 9. Auth & Context (`src/context/AuthContext.jsx`)

`AuthProvider` (dibungkus di `App.jsx`) menyediakan via `useAuth()`: `{ session, user, role, loading, showToast, signOut }`.
- Bootstrapping: `supabase.auth.getSession()` → set session/user → `fetchRole(userId)` (select role dari `profiles`) → `initFavorites(userId)` (sinkron localStorage favorites dari tabel `saved_properties`). Berlangganan `onAuthStateChange` untuk alur yang sama.
- `showToast(message, type)` → render komponen `Toast` (auto-dismiss 4 detik).
- `signOut()` → `supabase.auth.signOut()` (error ditelan) + clear state.

**Pola auth yang disepakati**: gunakan `session?.user` (lebih stabil dari `user`) untuk conditional. Panggil `onLogout?.()` dari props, jangan `supabase.auth.signOut()` langsung di komponen (HamburgerMenu tidak double-signOut). Role di-fetch ulang tiap drawer dibuka.

## 10. Komponen — Per Halaman

### ExplorePage (`/`, `/explore`)
Halaman utama. **Fitur**: hero banner, quick menu (8 ikon: cari/iklan/cari agen/kalkulator KPR/price drop/forum/refinance/lainnya), search bar (title/address/city ILIKE), filter drawer (harga, tipe `PROPERTY_TYPE_OPTIONS`, jumlah kamar), kategori Dijual/Disewa, sort (Terbaru/Termurah/Termahal), grid properti + skeleton loading, "Rekomendasi" section + "Popular Searches" (4 kartu), tombol compare per kartu, heart favorit.
**Integrasi**: `fetchProperties(filters)` query `properties` hanya `status='verified'`. `getFavorites()`/`toggleFavorite`. `getCompareList`/`addToCompare`/`removeFromCompare` + dispatch `compare-updated`. Render `<RecentlyViewed/>` dan `<CompareBar/>`. **Dynamic EN translation**: saat `lang==='en'`, `batchTranslate(displayListings)` → `getTranslated(prop, field, fallback)`. Memakai `DUMMY_PROPERTIES` fallback jika DB kosong. Semua gambar pakai `getImageSrc` + `onError` → `FALLBACK_IMAGE`.

### PropertyDetailPage (`/property/:id`)
2-kolom grid: kiri `lg:col-span-2` (galeri, judul, harga, spesifikasi, deskripsi, `KprSimulator initialPrice={property?.price}`, accordion "Panduan Membeli" + "Disclaimer"), kanan `lg:col-span-1` (Agent Card sticky `sticky top-24`).
- **GalleryDesktop** (Airbnb-style 1 besar + 2x2 grid, sembunyi `<lg`) & **GalleryMobile** (hero aspect-[4/3] + 4 thumb, overlay "Lihat Semua" bila >5). Keduanya → `openLightbox(index)`.
- **Lightbox**: fullscreen `z-[100]`, counter N/total, prev/next, keyboard Escape/arrows, body scroll lock.
- **AgentCard**: join `profiles(first_name, role)`, avatar inisial + warna hash (`getAvatarColor`/`getInitials`), role label, tombol Phone + WhatsApp.
- **Smart floating WhatsApp bar**: IntersectionObserver pada Agent Card (`rootMargin '0px 0px 50px 0px'`) → sembunyikan bar via `translate-y-[150%]` saat kartu terlihat.
- **Recency**: `addRecentlyViewed(match)` dipanggil setelah fetch sukses (dummy & DB path) → masuk `vastara_recently_viewed`.
- **Translation**: `useGroqTranslation(id, {title, address, property_type})`; `description_en` ditampilkan langsung saat en; WhatsApp message localized.
- Fallback kolom `??` (address/location, area_sqm/sqm, dll) untuk backward compatibility.

### SellPropertyPage (`/sell`, `?edit=id`)
Form multi-step (3 step):
- **Step 0 Info Properti**: category, property_type, title, price, bedrooms, bathrooms, area_sqm, certificate, description + **tombol "Saran AI"** (Groq, generate deskripsi), address, city, district.
- **Step 1 Foto & Lokasi**: drag-and-drop reorder (gambar pertama = utama), upload paralel `Promise.all()` ke storage `PROPERTIES_IMAGE`, `image_url` = `JSON.stringify(urls)`, max 10 foto / 5MB / JPG-PNG-WEBP-AVIF. Cleanup `URL.revokeObjectURL` di effect.
- **Step 2 Review & Kirim**: PreviewCard, ringkasan, input WhatsApp seller.
- Draft autosave ke localStorage, dibersihkan setelah submit sukses. Insert `status: 'pending'` eksplisit. Notifikasi via `showToast`.

### MyListingsPage (`/my-listings`)
Daftar listing milik user (`seller_id = user.id`, order created_at desc). **StatusBadge**: sold→"Terjual", pending→"Menunggu Verifikasi", in_review→"Sedang Survei", else→"Terverifikasi". **StatusTimeline** 3-step (pending→in_review→verified). Edit → `/sell?edit=id`. **Mark as sold**: confirm modal → update `status:'sold'` + optimistic patch.

### RoleSelectionPage (`/sell-role`)
Pilih peran sebelum iklan: Agent/Developer/Owner → navigasi `/sell` dengan `state: { role }` (dibaca SellPropertyPage). Terproteksi.

### ForumPage (`/forum`)
Daftar diskusi: kartu post (avatar inisial + warna hash, dynamic category badges berwarna), info aktivitas (jumlah reply + avatar stack), **search bar** + **filter kategori**, compose form (dengan selector kategori), **edit post inline**, **delete** (ConfirmModal), **cancel confirmation** saat batal compose. Semua text memakai i18n.

### ForumDetailPage (`/forum/:id`)
Detail post + reply system: OP badge, **like/upvote** toggle via `forum_likes` (polymorphic target_type post/reply, count di-fetch per post + bulk replies), **edit inline** post & reply, **quote reply** (`<!--replyto:author|snippet-->` → diparse `parseReplyContent()`), **realtime** subscribe `postgres_changes` INSERT on `forum_replies`, `timeAgo`, sticky reply form, auto-scroll ke reply baru, success toast, guest CTA. Guard `author_id` di semua update.

### ChatHubPage (`/chat`)
Realtime direct messaging. Two-column (desktop) / toggle view (mobile via `showMobileList`).
- **Contact list**: dibangun dari `direct_messages` (extract counterparty) + `profiles` role IN (agent,developer,admin), digabung & sort by last message DESC. Avatar inisial, role label, preview pesan, `timeAgo`.
- **Chat window**: bubble sendiri `bg-brand-primary text-white`, diterima putih; auto scroll-to-bottom; `timeAgo` per pesan.
- **Kirim**: Enter/button → insert `direct_messages`. Disable saat mengirim + spinner.
- **Realtime**: channel `direct-messages-{userId}` filter `or(sender_id.eq.USER,receiver_id.eq.USER)` → append pesan + reorder contact list.
- **Auth guard**: LoginPrompt bila belum login.

### AdminDashboardPage (`/admin`) + AdminAnalyticsCards + AdminUserManagement + AdminAuditLog
3-tab (Overview / Users / Audit Trail), tab bar sticky dengan underline indicator.
- **AdminAnalyticsCards**: 4 metric cards (Properti Terverifikasi emerald, Menunggu Verifikasi amber, Total Pengguna sky, Agen & Developer violet). Count via `select('*', {count:'exact', head:true})` paralel `Promise.all`. Skeleton loading.
- **Pending properties table** di tab Overview: Verify / Reject → otomatis `insertAuditLog()` fire-and-forget. Reject = delete dari DB.
- **AdminUserManagement**: table semua user dari `profiles` (Nama, Email, WhatsApp, Role badge, Aksi). Inline `<select>` ubah role → `profiles.update` + insert `audit_logs` + toast. Badge "Anda" untuk diri sendiri.
- **AdminAuditLog**: table 100 entri terbaru DESC. Kolom Admin / Tindakan (badge: verify=emerald, reject=red, change_role=blue) / Target (dari `target_detail` JSONB) / Waktu (`timeAgo`). Empty state ikon History.

### KprCalculatorPage (`/kpr`)
Kalkulator KPR halaman penuh. **2 kolom desktop**: kiri = input + `FinancialProfileForm`; kanan = hasil.
- Input: Harga (default 1M), DP dual input %↔Rp + slider (0–100, sudah diseragamkan), Suku Bunga (default 5.5), Tenor select (5–25).
- Kanan: kartu cicilan bulanan (`AnimatePresence` animasi saat nilai berubah), **Rincian Finansial** (progress bar DP/Pokok, Harga, DP, Pokok, Total Bunga, Total Pembayaran), **Tabel Amortisasi** collapsible (breakdown per tahun), **Estimasi Biaya Lainnya** (BPHTB 5% × (harga−60jt), PPN 11%, Notaris 1% [clamp 5–15jt], Provisi 1% × pokok) + **Total Dana Awal Dibutuhkan**.
- **Kemampuan Finansial** (bila ada profil): gaji bersih, cicilan berjalan, batas ideal 30%, estimasi harga terjangkau (`maxAffordablePrice`), + kartu status dalam/melebihi batas dgn progress bar & saran.
- **Aksi**: WhatsApp consult (message pre-filled) + HuniBot consult (dispatch `open-hunibot-with-context`) + banner "Tanya HuniBot" (dispatch `open-hunibot-question`).
- Safe back navigation: `window.history.length > 1 ? navigate(-1) : navigate('/')`. Pakai `useSEO`.

### ComparePage (`/compare`)
Tabel perbandingan side-by-side max 3 properti + banner **Daya Beli**.
- Data: `vastara_compare` (list ringkas) → load penuh; id berawalan `dummy-` dicari di `DUMMY_PROPERTIES`, selainnya fetch `properties` `.in('id', ids)`.
- Race-condition guard: `requestId === requestRef.current`.
- **Daya Beli banner**: `getFinancialProfile()` → `computeAffordability` → `maxAffordablePrice(maxInstallment, BUYING_POWER_ASSUMPTION.*)`. Jika belum login → CTA ke `/login`; jika belum ada profil → dispatch `open-financial-profile`.
- Baris: Harga (badge "Termurah" bila = minPrice), Cicilan/bln est (`estimateMonthlyInstallment`, merah bila > maxInstallment; properti sewa `typeLabel==='Disewa'` tampil `-`), Tipe, Kamar, Kamar mandi, Luas, Kota, Alamat, Sertifikat. Header cells link ke `/property/:id` + badge Terjangkau/Melebihi Batas.
- Listen `financial-profile-saved`, `compare-updated`, `storage`. Remove/Clear → dispatch `compare-updated`. Full i18n (`compare.*`).

### CompareBar
Fixed bottom bar bila compare list tidak kosong: thumbnail items + counter `n/3` + tombol hapus per item + tombol "Bandingkan" → `/compare`. Sync via `storage` + `compare-updated`.

### RecentlyViewed
Horizontal scroll carousel "Terakhir Dilihat": kartu thumbnail + label waktu (`timeAgo` dari `viewed_at`), counter, tombol hapus per item, tombol "Bersihkan", scroll arrows (kiri/kanan), tombol compare per kartu (dispatch `compare-updated`), empty state. Live sync: listen `recently-viewed-changed` + `storage`. i18n `recently.*`.

### SavedPropertiesPage + SavedPropertiesList
- **SavedPropertiesPage**: halaman "Properti Disimpan" + filter pills (Semua/Tersedia `status=verified`/Sedang Nego `status=pending`), heart toggle unsave, StatusBadge, harga `/bulan` bila category Disewa.
- **SavedPropertiesList**: daftar ringkas reusable (dipakai di ProfileDrawer & HamburgerMenu): props `showAddress`, `emptyText`, `emptyCtaLabel`, `onEmptyCta`, `onItemClick`. Fetch `properties` by favorit ids, fallback dummy.

### KprSimulator
Widget KPR reusable (dipakai di PropertyDetailPage via prop `initialPrice`, default 900jt).
- **Sinkronisasi konstanta & formula**: default = `BUYING_POWER_ASSUMPTION` `{interestRate:5.5, tenorYears:15, dpPercentage:20}`; formula cicilan = `estimateMonthlyInstallment(price, rate, tenor, dp)` dari `utils/financialProfile.js`; `TENOR_OPTIONS` diimpor dari financialProfile (dibagikan dengan KprCalculatorPage).
- Fitur: preset chips DP (10/20/30/50%) & tenor (10/15/20/25 Thn), slider DP 0–100 (konsisten dgn input), input DP %↔Rp dua arah, kartu estimasi cicilan dengan **CountUp** (rAF animation), kartu **Rincian Finansial** (DP/Pokok/Total Bunga/Total Pembayaran), **Estimasi Gaji Minimum** (cicilan/0.3, aturan 30%), kartu affordability (dalam/melebihi batas + progress bar + saran "Naikkan DP"/"Perpanjang tenor"), tombol **Bagikan via WhatsApp**, tombol **Jelaskan ke HuniBot** (dispatch `open-hunibot-question` dgn konteks angka simulasi), CTA "Cek kemampuan finansial" → `/kpr` bila belum ada profil.
- **Full i18n** (`kpr.*`).

### InvestmentAnalyzer
Widget analisis investasi AI per properti (dipakai di PropertyDetailPage).
- Input: target yield (3–12%, default 6), horizon (5/10/15 thn), intent (rent/resale/occupy).
- Alur: `handleAnalyze()` → fetch comparables (`properties` status verified, ±30% harga, limit 5) + financial profile → `POST /api/groq` `{model:'openai/gpt-oss-120b', purpose:'investment', property, financialProfile, investmentGoals}` → parse JSON (cleanJson strip fenced code) → render.
- Output: score ring (SVG donut `pathLength` animated), kartu estimasi finansial (CountUp), buying-power bar, market rows, goal-fit scores, verdict analis.
- `normalizeRisk` map "rendah/sedang/tinggi" (ID & EN). Bila tidak personalized → badge "Analisis generik" → dispatch `open-financial-profile`.

### FinancialProfileForm
Form profil finansial (dipakai di KprCalculatorPage & ProfileDrawer; props `onSaved`, `showTitle`).
- Fields: monthlyIncome, monthlyCommitments, monthlyBudget, purchaseGoal (segmented dari `PURCHASE_GOAL_OPTIONS`).
- Live: affordability (`computeAffordability`), **DSR gauge** (≤30 hijau "Sehat", ≤40 amber, else merah), **daya beli** (`maxAffordablePrice`), progress pengisian (4 dari 4), preset income buttons (5/10/15/20 jt), tombol "Pakai saran" (budget = takeHome × 30%), warning bila commitments > income / budget > take-home.
- `handleSave()` → `saveFinancialProfile` (UPSERT `onConflict:'user_id'`) → `onSaved` + dispatch `financial-profile-saved`. Unauth → CTA login.

### ScheduleVisit
Bottom sheet "Atur Jadwal Survei" (props `property`, `onClose`). Date range besok–+30 hari, time default '10:00', notes. Insert `site_visits`. Unauth → pesan login. Sukses → state "Permintaan Terkirim!". Pakai `showToast` pada error.

### HuniBot
Floating AI chatbot (bottom-right FAB). Selalu mounted di App, **disembunyikan di `/kpr`** (hanya FAB `hidden`) supaya tetap bisa menerima open events.
- Konversasi: `SYSTEM_MESSAGE` (domain guard properti/KPR/legal, ID, ringkas 2-3 paragraf) + optional `{role:'system', content:'HUNIONE_PROFILE: …'}` (konteks finansial dari `getFinancialProfile`) + 10 pesan history terakhir (cap 400 char) + pesan user. POST `/api/groq` `{model:'openai/gpt-oss-120b', purpose:'chat'}`.
- Rate limit lokal 2 detik (`RATE_LIMIT_MS`). Quick replies (KPR, BPHTB, tips rumah pertama, SHM vs HGB). Auto-grow textarea (max 120px), Enter kirim / Shift+Enter newline, scroll-to-bottom, tombol "jump to bottom" bila scroll naik.
- Events: `open-hunibot` (buka), `open-hunibot-with-context` (seeding pesan perbandingan cicilan vs affordability), `open-hunibot-question` (auto-send setelah 150ms).
- Greeting personal: "Halo, {firstName}!" bila login.

## 11. Komponen UI Reusable

| Komponen | Fungsi & Props |
|---|---|
| **SlideOver** | Drawer kanan reusable: `isOpen`, `onClose`, `title`, `width` (default max-w-md), `zIndex` (100), `headerExtras`, `footer`. Focus trap, Escape close, body scroll lock, prefers-reduced-motion. Dipakai: ProfileDrawer, HamburgerMenu. |
| **ConfirmModal** | Modal konfirmasi: `isOpen`, `title`, `message`, `confirmLabel`, `onConfirm`, `loading`, `danger` (default true), `icon`, `zIndex`. AnimatePresence + backdrop blur. Dipakai: ForumPage, ForumDetailPage, HamburgerMenu (logout), MyListingsPage. |
| **Toast** | Notifikasi: `message`, `type` (success/error/info), `onClose`. Auto-dismiss 4s. Dirender oleh AuthContext. |
| **InfoTooltip** | Tooltip ikon info dengan teks (dipakai di form KPR, tabel amortisasi, dll). |
| **CountUp** | Angka animasi count-up (rAF 800ms, easeOutCubic): `value`, `format` (default `formatCurrency`), `duration`. Dipakai: KprSimulator, InvestmentAnalyzer (yang punya versi lokal sendiri). |
| **ErrorBoundary** | Class error boundary: fallback layar penuh + tombol reload. |
| **SavedPropertiesList** | Lihat bagian Saved. |
| **MoreCategoriesDrawer** | Bottom sheet kategori "dijual/disewa" dgn **swipe-to-close** (`useDragControls`, `drag="y"`, tutup bila offset>100 / velocity>300). Item → `/coming-soon`. |
| **RescheduleBottomSheet** | Bottom sheet jadwal ulang survei — **masih prototype UI** (TODO: fetch jadwal agen & UPDATE `survey_schedules` belum diimplementasi). |
| **ComingSoonPage** | Placeholder halaman dalam pengembangan. |
| **NotFoundPage** | "Property not found" screen; props `message`, `onBack`; pakai `useSEO`. |

## 12. Utils (`src/utils/`)

- **financialProfile.js** — pusat logika finansial:
  - `BUYING_POWER_ASSUMPTION = { interestRate: 5.5, tenorYears: 15, dpPercentage: 20 }` (sumber kebenaran asumsi KPR).
  - `TENOR_OPTIONS = [5,10,15,20,25]` (dibagikan KprSimulator & KprCalculatorPage).
  - `getFinancialProfile()` / `saveFinancialProfile(values)` — baca/upsert `user_financial_profiles`.
  - `computeAffordability(profile)` → `{income, commitments, budget, takeHome, maxInstallment}`; `maxInstallment = min(budget, takeHome×0.3)` bila budget>0, else `takeHome×0.3`.
  - `maxAffordablePrice(maxInstallment, rate, tenor, dp)` — balikkan harga maksimal.
  - `estimateMonthlyInstallment(price, rate, tenor, dp)` — annuity formula `M = P·i·(1+i)^n / ((1+i)^n − 1)`, edge cases 0% bunga & principal≤0.
  - `PURCHASE_GOAL_OPTIONS` / `PURCHASE_GOAL_LABELS` (5 tujuan), `formatRupiah`.
- **compare.js** — `getCompareList`, `addToCompare` (max `MAX_ITEMS=3`), `removeFromCompare`, `isInCompare`, `clearCompare`. Key `vastara_compare`.
- **favorites.js** — `getFavorites`, `setSupabase` (di-inject AuthContext), `initFavorites(userId)` (sync dari `saved_properties`), `toggleFavorite(id)` (local + Supabase sync, `syncFavorite` alias), `isFavorite`, `clearFavorites`. Key `hunione_favorites`, migrasi `vastara_favorites`.
- **recentlyViewed.js** — `getRecentlyViewed`, `addRecentlyViewed(property)` (unshift max 10 + `viewed_at`), `removeRecentlyViewed`, `clearRecentlyViewed`, `CHANGE_EVENT='recently-viewed-changed'`.
- **format.js** — `formatPrice(value)` (Rp + suffix M/Jt), `formatCurrency(value)` (Intl.NumberFormat id-ID IDR, 0 desimal), `formatShort(value)` (M/Jt short).
- **images.js** — `FALLBACK_IMAGE` (Unsplash), `parseImages(imageUrl)` (handle single string / JSON array / array literal), `getImageSrc(imageUrl)` (URL pertama atau fallback). **Semua `<img>` data DB harus `onError` → fallback.**
- **avatar.js** — `getAvatarColor(id)` (warna konsisten dari hash), `getInitials(name)`.
- **time.js** — `timeAgo(dateString)` relative time ID ("baru saja", "5 menit yang lalu", dll).

## 13. Hooks (`src/hooks/`)

- **useSEO({title, description, image})** — set `document.title` + meta/OG tags; reset saat unmount. BASE: "HuniOne — Platform Properti Terpercaya".
- **useGroqTranslation.js** — dynamic ID→EN translation via Groq:
  - `useGroqTranslation(propertyId, fields)` → `{ translated, loading, getText(field, fallback) }`. Aktif hanya saat `lang==='en'`.
  - `batchTranslate(properties, signal)` — dedup & batch untuk ExplorePage.
  - Cache module-level Map (persist ke `vastara_translation_cache_v1`, max 300) + `inflight` Map untuk dedup request.
- **useChatUnread(userId)** — `{ unread, markRead }`. Count `direct_messages` receiver_id=userId & created_at>lastRead (head-count query) + realtime channel `hamburger-unread-${userId}` INSERT. `markRead` → tulis `huniOne_last_chat_read` & reset. Dipakai HamburgerMenu (badge 99+).
- **usePrefersReducedMotion()** → `{ reduced }` — detect `prefers-reduced-motion`, respon change listener, guard SSR.

## 14. i18n

- `src/i18n.js`: resources `id` & `en`, `lng: 'id'`, `fallbackLng: 'en'`, escapeValue false.
- Namespace tunggal `translation`. Top-level keys: `navbar`, `common`, `compare`, `hamburger`, `profileDrawer`, `login`, `roleSelection`, `explore`, `comingSoon`, `recently`, `kpr`, `forum`/`forumDetail` (dsb).
- Interpolation `{{var}}`; string multiline WA memakai `\n` literal di JSON.
- **Komponen yang sudah full i18n**: ExplorePage, TopNavbar, HamburgerMenu, ProfileDrawer, MinimalistLogin, RoleSelectionPage, ForumPage, ForumDetailPage, ComparePage, CompareBar, SlideOver, RecentlyViewed, KprSimulator, ComingSoonPage.
- **Masih hardcoded Indonesia** (belum i18n): Footer, MyListingsPage, ChatHubPage, Admin* , SellPropertyPage, SavedPropertiesPage, InvestmentAnalyzer, FinancialProfileForm, ScheduleVisit, HuniBot, ErrorBoundary, NotFoundPage, MoreCategoriesDrawer, RescheduleBottomSheet, Toast. — catatan ini penting kalau mau lanjut merapikan i18n.

## 15. Konvensi & Pola Kode (penting untuk AI yang meneruskan pengerjaan)

1. **React 19 compliance**: tidak boleh ada komponen didefinisikan di dalam render. Komponen statis di-declare di top-level; kalau butuh "komponen dalam render", gunakan function call `{myFunc()}` bukan JSX, atau pindah ke luar. ESLint rule `react-hooks/set-state-in-effect` & `react-hooks/static-components`.
2. **Async Supabase**: selalu `try/catch` + `cancelledRef`/cancelled flag untuk mencegah setState setelah unmount. Count query: `select('*', { count: 'exact', head: true })`.
3. **Named kolom properties**: `address` (bukan location), `area_sqm` (bukan sqm), `seller_whatsapp` (bukan agent_whatsapp), `description_id`/`description_en`. Semua komponen sudah punya fallback `??`.
4. **Multi-image**: selalu lewat `parseImages`/`getImageSrc` + `onError` fallback.
5. **RBAC**: `role === 'admin'` → menu Dashboard Admin (TopNavbar/HamburgerMenu/ProfileDrawer) + akses `/admin`. Role lain fallback "Pembeli".
6. **Audit logging**: setiap aksi admin (verify/reject/change_role) → insert `audit_logs` fire-and-forget; `target_detail` JSONB kontekstual.
7. **Brand**: nama "HuniOne", logo `/huniOne.svg`. Copyright "© 2026 HuniOne". Semua referensi "PT Vastara Holding" sudah dihapus.
8. **Duplicate logic maintenance risk**: `api/groq.js` dan `vite.config.js` (dev proxy) harus dijaga identik; begitu juga `formatCurrency` sempat diduplikasi (kini shared di `utils/format.js`).
9. **Real-time enable manual**: `direct_messages` realtime harus di-toggle di Supabase Dashboard → Database → Replication.
10. **Lint/build**: `npm run lint` (eslint), `npm run build` (vite build). Build output di `dist/`.
11. **Dummy data**: properti `dummy-*` dari `data/dummyProperties.js` dipakai sebagai fallback di ExplorePage, ComparePage, SavedPropertiesList.

---

*Dokumen ini dibuat otomatis berdasarkan eksplorasi menyeluruh codebase. Versi & tanggal diperbarui setiap kali ada perubahan arsitektur besar.*
