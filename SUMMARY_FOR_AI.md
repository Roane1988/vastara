# Project HuniOne — Ringkasan Struktur untuk AI

Platform properti (jual/beli/sewa) dengan forum diskusi komunitas, AI chatbot (HuniBot), dynamic i18n translation via Groq API, realtime direct messaging, admin dashboard.

Deploy: **Vercel** (SPA + serverless functions) — domain: **hunione.com**

---

## Tech Stack
- **Framework**: React 19 + Vite 8
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS v4 (CSS-based config di `src/index.css`, **tidak ada** `tailwind.config.js`)
- **Routing**: react-router-dom v7
- **Auth & Database**: Supabase (RLS, Auth, Realtime, Storage)
- **Icons**: lucide-react
- **Animasi**: framer-motion
- **i18n**: react-i18next + i18next (ID/EN)
- **AI Translation**: Groq API (`llama-3.3-70b-versatile`) via backend proxy
- **Chatbot**: HuniBot with Groq API
- **Map**: leaflet + react-leaflet
- **Rate Limiting**: lru-cache (in-memory, Vercel serverless)

---

## Routing (`src/App.jsx`)
| Path | Component | Auth Required |
|---|---|---|
| `/` atau `/explore` | ExplorePage | Tidak |
| `/login` | MinimalistLogin | Tidak |
| `/sell-role` | RoleSelectionPage | **Ya** |
| `/sell` | SellPropertyPage | **Ya** |
| `/my-listings` | MyListingsPage | **Ya** |
| `/chat` | ChatHubPage | Tidak |
| `/forum` | ForumPage | Tidak |
| `/forum/:id` | ForumDetailPage | Tidak |
| `/property/:id` | PropertyDetailPage | Tidak |
| `/admin` | AdminDashboardPage (via `AdminRoute`) | **Ya (admin only)** |
| `/coming-soon` | ComingSoonPage | Tidak |

`ProtectedRoute` redirect ke `/login` jika belum login, menyimpan `state.from` untuk redirect balik. `AdminRoute` redirect ke `/` jika `role !== 'admin'`.

---

## Struktur Folder `src/`

### `components/` — 22 komponen halaman/UI

| File | Fungsi |
|---|---|
| **AdminDashboardPage.jsx** | Backoffice admin 3-tab: **Overview** (analytics cards + pending properties table), **Users** (manajemen pengguna), **Audit Trail** (log riwayat tindakan admin). Tab bar sticky dengan underline indicator. Verify/Reject properti otomatis mencatat ke `audit_logs`. Route `/admin` via `ProtectedRoute`. |
| **Footer.jsx** | Mega footer premium: dark background (`bg-brand-primary`), grid 5 kolom (brand + 4 nav columns: Jelajahi, Perusahaan, Bantuan, Legal), container `max-w-7xl`. Bottom section: "Follow Us" heading + 4 social icons (Instagram/LinkedIn/TikTok/Facebook) with real links + copyright "© 2026 HuniOne. All rights reserved.". Terpasang di `App.jsx` setelah routing. |
| **ExplorePage.jsx** | Halaman utama: hero banner, search, grid properti, filter drawer (server-side via Supabase), rekomendasi, listing lengkap. `fetchProperties()` menerima `filters` object. Thumbnail pakai `getImageSrc(p.image_url)` dari `utils/images.js` untuk backward compatibility (single string or JSON array). **Dynamic EN translation**: `useEffect` memanggil `batchTranslate(allProps)` saat `lang === 'en'`, menyimpan hasil di `translationRef`. `getTranslated(prop, field, fallback)` digunakan di recommendation cards dan listing grid untuk title/address. |
| **PropertyDetailPage.jsx** | Detail properti: **GalleryDesktop** (Airbnb-style: 1 main large + 2x2 grid) sembunyi di `lg:block`, **GalleryMobile** (`<lg`: hero aspect-[4/3] + 4-thumb grid `grid-cols-4 gap-0.5`, thumb ke-4 overlay "Lihat Semua" jika >5 gambar, filler `bg-brand-border` untuk <4 gambar). Mobile CTA `bg-red-50` "Hubungi Pengiklan Segera". Agent Card (avatar inisial + warna hash dari `seller_id`, nama dari `profiles.first_name` via join query, role dari `profiles.role`, 2-col grid Phone outline + WhatsApp green-solid). Accordion "Panduan Membeli Properti" + "Disclaimer". Guard `if (!id)` + fallback column names. **Dynamic EN translation**: `useGroqTranslation` hook untuk title/address/type. `description_en` ditampilkan langsung saat `lang === 'en'` dan tersedia, fallback ke `description_id`. Spinner animasi saat translation loading. WhatsApp message lokalized. |
| **SellPropertyPage.jsx** | Form multi-step (5 step) jual properti: pilih peran, **multi-image upload** (maks 10 foto, preview grid 3-4 kolom dengan thumbnail + tombol X hapus per file + tombol "Tambah"), upload paralel via `Promise.all()` ke storage `PROPERTIES_IMAGE`, `image_url` disimpan sebagai `JSON.stringify([url1, url2, ...])`. Notifikasi pakai `showToast` dari `useAuth` (bukan komponen lokal `AppToast`). Ada `useEffect` cleanup untuk `URL.revokeObjectURL` pada preview. |
| **MyListingsPage.jsx** | Daftar properti milik user sendiri (fetch by `seller_id`). Status badge "Menunggu Verifikasi" / "Terverifikasi". |
| **RoleSelectionPage.jsx** | Onboarding pilih peran (Agent/Developer/Owner) setelah login. |
| **ForumPage.jsx** | Daftar diskusi forum: kartu post dengan avatar (inisial + warna hash), badge "Umum", info aktivitas (replies count + avatar stack), compose form collapse toggle. |
| **ForumDetailPage.jsx** | Detail post + reply system: avatar inisial, OP badge, upvote button (`ThumbsUp`), quote reply (`<!--replyto:...-->`), realtime subscription ke `forum_replies`, relative time (`timeAgo`), sticky reply form, guest CTA. |
| **ChatHubPage.jsx** | In-app realtime direct messaging: contact list (kiri) + chat window (kanan). Responsive two-column (desktop) / toggle view (mobile). Contact list menampilkan profil agen/admin + riwayat chat terakhir. Chat window: message bubbles (brand-primary untuk sent, white untuk received), scroll-to-bottom otomatis, realtime subscription via Supabase Realtime, input bar dengan Enter/Esc support. Auth guard: jika belum login tampilkan prompt login. |
| **AdminAnalyticsCards.jsx** | 4 metric cards di dashboard Overview: Properti Terverifikasi (CheckCircle/emerald), Menunggu Verifikasi (Clock/amber), Total Pengguna (Users/sky), Agen & Developer (Briefcase/violet). Fetch count via `select(*, { count: 'exact', head: true })` in parallel `Promise.all`. Loading state: skeleton cards. |
| **AdminUserManagement.jsx** | Data table semua user dari `profiles` dengan kolom Nama, Email, WhatsApp, Role (badge warna), Aksi. Inline `<select>` dropdown untuk ubah role (pembeli/owner/agent/developer/admin). Update role → insert `audit_logs`. Badge "Anda" untuk user sendiri. |
| **AdminAuditLog.jsx** | Data table audit trail dari `audit_logs` (100 entri terbaru, DESC). Kolom: Admin, Tindakan (badge warna: verify=emerald, reject=red, change_role=blue), Target (summary dari `target_detail` JSONB), Waktu (`timeAgo`). Empty state: ikon History. |
| **ConfirmModal.jsx** | Modal konfirmasi reusable untuk aksi destruktif (hapus post forum, dll). Animasi framer-motion `AnimatePresence`, backdrop blur, tombol Batal + Konfirmasi (merah). Dipakai di `ForumPage` dan `ForumDetailPage`. |
| **MinimalistLogin.jsx** | Login/Signup: email/password, Google OAuth (`supabase.auth.signInWithOAuth`), toggle password visibility. |
| **TopNavbar.jsx** | Navbar sticky: logo "HuniOne", language switcher, notifikasi, profil, hamburger menu. |
| **HamburgerMenu.jsx** | Menu slide-out navigasi samping dengan daftar favorit. Fetch `role` dari `profiles` tiap buka. Jika `role === 'admin'`: tampilkan item "Dashboard Admin" di menu utama + label "Admin Internal" (biru) alih-alih "Pembeli". **Profile card clickable**: avatar + nama + role dibungkus `<button>` dengan `onClick={handleProfile}` — membuka ProfileDrawer. Styling: `cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200`. Duplikasi item "Informasi Pribadi" di bagian Pengaturan sudah dihapus. |
| **ProfileDrawer.jsx** | Drawer profil: info user, edit profil (first_name, email, whatsapp), saved properties, logout. Ada 2 efek: fetch saved + fetch profile (termasuk `role`). Jika `role === 'admin'`: tampilkan badge "Admin Internal" di header + item "Dashboard Admin" di menu navigasi. |
| **NotificationDrawer.jsx** | Drawer notifikasi (grup Today/Yesterday). |
| **MoreCategoriesDrawer.jsx** | Bottom sheet kategori properti. **Swipe-to-close**: `useDragControls` dari framer-motion — `drag="y"` pada sheet container, `dragConstraints={{ top: 0 }}`. Drag handle (`onPointerDown`) trigger drag, `touch-none` biar scroll content tidak konflik. `onDragEnd` tutup drawer jika offset.y > 100 atau velocity.y > 300. Handle punya `cursor-grab active:cursor-grabbing`. |
| **RescheduleBottomSheet.jsx** | Bottom sheet reschedule janji survei (pilih tanggal & jam). |
| **SavedPropertiesPage.jsx** | Properti tersimpan/favorit user (localStorage via `favorites.js`). |
| **ComingSoonPage.jsx** | Placeholder halaman dalam pengembangan. |
| **NotFoundPage.jsx** | Fallback properti tidak ditemukan. |
| **Toast.jsx** | Notifikasi auto-dismiss (4000ms). Tipe: success (CheckCircle/green), error (AlertCircle/red), info (Info/blue). |

### `context/`
- **AuthContext.jsx**: Supabase auth state (`session`, `user`, `loading`, `showToast`, `signOut`). Ada cancelled flag di effect + `.catch()` di `getSession()`. `showToast` memanggil `setToast` dengan timer. Wrapped dalam `AuthProvider` di `App.jsx`. Export: `AuthProvider` (default) + `useAuth` (named).

### `data/`
- **dummyProperties.js**: Fallback properti jika fetch Supabase kosong.

### `utils/`
- **favorites.js**: Helper favorite (pakai localStorage): `getFavorites()`, `toggleFavorite(id)`, `isFavorite(id)`, `clearFavorites()`. `toggleFavorite` adalah alias dari `toggleFavourite` — keduanya bisa dipakai untuk menghindari typo Britania/AS.
- **images.js**: Helper multi-image: `parseImages(imageUrl)` → array of URLs (handle single string, JSON array, atau array literal). `getImageSrc(imageUrl)` → URL pertama atau fallback Unsplash. `FALLBACK_IMAGE` (Unplash) — konstanta yang juga bisa dipakai di komponen untuk `onError` fallback.
- **format.js**: `formatPrice(value)` — format harga ke Rp dengan suffix M/Jt. Dulu inline di 5 file, sekarang reusable.
- **avatar.js**: `getAvatarColor(id)` + `getInitials(name)` — warna konsisten dari hash UUID + inisial dari `first_name`. Dulu inline di 3 file.
- **time.js**: `timeAgo(dateString)` — relative time in Indonesian. Dulu inline di 2 file.

### `locales/`
- `id/translation.json` — Bahasa Indonesia (238 baris)
- `en/translation.json` — English (238 baris)

### `hooks/`
- **useGroqTranslation.js**: Hook + utility untuk dynamic Indonesian-to-English translation via Groq AI. Module-level `cache` Map + `inflight` Map untuk dedup request. Dua export:
  - `useGroqTranslation(propertyId, fields)` — untuk single property (PropertyDetailPage). Return `{ translated, loading, getText(field, fallback) }`.
  - `batchTranslate(properties, signal)` — async batch utility (ExplorePage). Dedup otomatis, kirim hanya uncached texts dalam satu POST ke `/api/groq`.

### Root files
- **i18n.js**: Konfigurasi i18next dengan deteksi bahasa browser.
- **supabaseClient.js**: Inisialisasi Supabase client + validasi env var.
- **index.css**: Tailwind v4 theme (`@theme`) + custom keyframes + `no-scrollbar` utility.

---

## Backend / API

### `api/groq.js` (Vercel Serverless Function)
Proxy untuk Groq AI API. Menerima POST dengan `{ model, messages }`, meneruskan ke `api.groq.com` dengan `process.env.GROQ_API_KEY` (server-side only, tidak ada `VITE_` prefix).

**Keamanan**:
- **Rate limiting**: lru-cache in-memory, max 20 req/min per IP.
- **Model restriction**: hanya `llama-3.3-70b-versatile` yang diizinkan.
- **Body validation**: validasi `messages` array — tiap item harus punya `role` (system/user/assistant) dan `content` string (max 10.000 chars).
- **Error handling**: 405 (method), 429 (rate limit), 400 (invalid body), 403 (model), 500 (fetch failed).
- **Prompt injection prevention**: `req.body.purpose` (`'chat'` / `'translation'`) pilih system prompt dari `SYSTEM_PROMPTS` map. Client system role selalu di-strip. Dua prompt: HuniBot (ID, properti-only, maks 2-3 paragraf) dan translator (EN, JSON-only).
- **Temperature & tokens**: chat → 0.7 / 1024, translation → 0.3 / 2048.

### `vercel.json`
Security headers & routing konfigurasi untuk Vercel deploy.

**Rewrites**:
- `/api/(.*)` → `/api/groq`
- `/(.*)` → `/index.html` (SPA fallback)

**Security Headers** (semua routes):
| Header | Value |
|---|---|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'`; script/style: `unsafe-inline` + `unsafe-eval`; img: supabase.co + images.unsplash.com; connect: supabase.co + accounts.google.com |

**CORS** (API routes `/api/(.*)`):
- `Access-Control-Allow-Origin: https://hunione.com`
- Methods: GET, POST, OPTIONS
- Credentials: true

### `vite.config.js`
Dev server proxy middleware untuk `/api/groq` — membaca `env.GROQ_API_KEY` via `loadEnv()` (server-side). Identik dengan serverless function: rate limiting, model restriction, purpose-based system prompt, fetch ke Groq API, error handling.

---

## Database Supabase

### Table: `profiles`
- `id` (UUID, PK, references `auth.users`)
- `first_name`, `email`, `whatsapp`, `role`
- RLS: select all, insert/update/delete hanya owner.

### Table: `forum_posts`
- `id` (UUID, PK)
- `author_id` (UUID, FK → `profiles.id`)
- `title`, `content`, `created_at`
- RLS: select all, insert/update/delete hanya author.

### Table: `forum_replies`
- `id` (UUID, PK)
- `post_id` (UUID, FK → `forum_posts.id`)
- `author_id` (UUID, FK → `profiles.id`)
- `content` (support quoted reply format: `<!--replyto:authorName|snippet-->`)
- `created_at`
- RLS: select all, insert/update/delete hanya author.
- Realtime: `INSERT` event on `forum_replies` (subscribe di `ForumDetailPage`).

### Table: `properties`
- `id` (UUID, PK)
- `seller_id` (UUID, FK → `profiles.id`)
- `category` ('Dijual')
- `title`, `property_type`, `price` (bigint)
- `description_id`, `description_en` (TEXT — untuk EN description, disimpan statis dari hasil Groq translation atau input manual)
- `address`
- `bedrooms`, `bathrooms`, `area_sqm` (int, **bukan** `sqm`)
- `image_url` (TEXT — bisa single URL string legacy atau `JSON.stringify([url1, url2, ...])` untuk multi-image. Parsing via `utils/images.js:parseImages()`)
- `seller_whatsapp`
- `status` ('verified' / 'pending')
- `created_at`
- RLS: select all, insert/update/delete hanya seller.

### Table: `audit_logs`
- `id` (UUID, PK)
- `admin_id` (UUID, FK → `profiles.id`)
- `admin_name` (TEXT — denormalized for display)
- `action_type` (TEXT — `'verify_property'`, `'reject_property'`, `'change_role'`)
- `target_type` (TEXT — `'property'`, `'user'`)
- `target_id` (TEXT)
- `target_detail` (JSONB — flexible payload: `{ property_title, property_price }` or `{ user_name, old_role, new_role }`)
- `created_at` (TIMESTAMPTZ)
- RLS: select only admin, insert authenticated.
- Migration: `supabase/migrations/20260727_create_audit_logs.sql`.
- Dipakai oleh: `AdminDashboardPage.handleVerify` + `handleConfirmReject` (insert on success), `AdminUserManagement.handleRoleChange` (insert on role update), `AdminAuditLog` (select for display).

### Table: `direct_messages`
- `id` (UUID, PK)
- `sender_id` (UUID, FK → `profiles.id`, NOT NULL)
- `receiver_id` (UUID, FK → `profiles.id`, NOT NULL)
- `content` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, default now())
- RLS: select where user is sender or receiver, insert where user is sender.
- Migration: `supabase/migrations/20260727_create_direct_messages.sql`.
- Realtime: harus di-enable manual di Supabase Dashboard → Database → Replication → toggle INSERT on `direct_messages`.
- Dipakai oleh: `ChatHubPage` — fetch contacts, fetch messages, send message, realtime subscription.

### Storage: `PROPERTIES_IMAGE` (bucket)
- Untuk upload gambar properti dari `SellPropertyPage.jsx`.
- File path: `{userId}-{timestamp}-{sanitizedFileName}`
- Public URL via `getPublicUrl()`.
- Perlu RLS policy untuk INSERT (authenticated) + SELECT (public) agar bisa upload & tampilkan gambar.

---

## Catatan Penting untuk AI

### Auth
1. `useAuth()` dari `AuthContext` mengembalikan `{ session, user, loading, showToast, signOut }`. `user` bisa `null` saat belum login. Gunakan `session?.user` untuk conditional yang lebih reliable (soalnya `session.user` lebih stabil daripada `user`).
2. `signOut` — jangan panggil `supabase.auth.signOut()` langsung di komponen. Panggil `onLogout?.()` dari props (yang dipanggil di `App.jsx` via `handleLogout`). **Khusus**: `HamburgerMenu.handleLogout` hanya panggil `onLogout?.()` (tidak double signOut karena `onLogout` dari App sudah handle signOut).
3. Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### Properties
4. **Nama kolom**: properties pakai `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`). Semua component sudah punya fallback `??` untuk backward compatibility.
5. **Multi-image**: `image_url` sekarang menyimpan array JSON `JSON.stringify([url1, url2, ...])`. `parseImages(imageUrl)` dari `utils/images.js` handle backward compatibility (single string, JSON array, atau array literal). `getImageSrc(imageUrl)` ambil URL pertama untuk thumbnail. Dipakai di: ExplorePage (thumbnails), PropertyDetailPage (gallery), SavedPropertiesPage, HamburgerMenu, ProfileDrawer, MyListingsPage.
6. **SellProperty upload**: Maks 10 foto, preview grid dengan tombol Hapus (X) per file + tombol "Tambah" untuk menambah. Upload paralel via `Promise.all()`. Kolom `image_url` diisi `JSON.stringify(urls)`. Ada `useEffect` cleanup untuk `URL.revokeObjectURL` pada setiap perubahan `imageFiles`.
7. **Filter status di ExplorePage**: `fetchProperties()` hanya query `status === 'verified'` (`.eq('status', 'verified')`). Properti `pending` tidak bocor ke publik. Admin lihat properti pending di `/admin`.
8. **SOP Verifikasi**: Seller upload → `status: 'pending'` (eksplisit di `SellPropertyPage` insert). Admin verifikasi via `/admin` → `status: 'verified'`. Publik hanya lihat properti `verified` di `ExplorePage`. Properti ditolak → `delete` dari DB.
9. **PropertyDetail gallery**: `GalleryDesktop()` (Airbnb-style grid, sembunyi di `<lg`) + `GalleryMobile()` (hero aspect-[4/3] + 4-thumb grid, thumb ke-4 overlay "Lihat Semua" jika >5 gambar). Semua image + overlay "Lihat Semua" bisa diklik → `openLightbox(index)`. Menggunakan `parseImages(property.image_url)`.
10. **Lightbox**: Fullscreen modal `z-[100] bg-black` — header dengan tombol Close (`X`) + counter "N / total", image `object-contain` di tengah, navigasi prev/next (`ChevronLeft`/`ChevronRight`). Keyboard: Escape=tutup, ArrowLeft/Right=navigasi. Body scroll di-lock via `document.body.style.overflow='hidden'`.
11. **Agent Card**: Query properties dengan join `profiles(first_name, role)`. Seller avatar: inisial dari `profiles.first_name` + warna hash dari `seller_id`. Role: agent/developer/owner → "Agen Properti"/"Pengembang"/"Pemilik Langsung".
12. **Mobile CTA**: `bg-red-50 border-red-200 text-red-700` — "Hubungi Pengiklan Segera".
13. **Accordion**: "Panduan Membeli Properti" (6 langkah) + "Disclaimer" (teks legal). State via objek `accordionState`.

### Forum
14. Format quoted reply: `<!--replyto:authorName|snippet-->\npesan_baru`. Diparse oleh `parseReplyContent()`.
15. Realtime: `ForumDetailPage` subscribe ke `postgres_changes` INSERT on `forum_replies` — update daftar balasan otomatis tanpa refresh.
16. `timeAgo(dateString)` — dari `utils/time.js` (shared). Relative time in Indonesian ("baru saja", "5 menit yang lalu", dll).
17. Avatar tidak pakai `avatar_url` — inisial dari `first_name` + warna konsisten dari hash UUID user. Helper di `utils/avatar.js`: `getAvatarColor()` + `getInitials()`.

### Styling
18. **Tailwind v4**: Tidak ada `tailwind.config.js`. Konfigurasi theme via CSS `@theme` di `index.css`. Custom colors: `brand-primary` (#1E3A5F), `brand-accent` (#4A90E2), `brand-bg` (#F8FAFC), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#6B7280), `brand-border` (#E5E7EB), `brand-highlight` (#EDF4FD), `brand-verified` (#2E8B57), `brand-danger` (#DC2626).
19. **Desktop layout**: Halaman memakai `max-w-7xl mx-auto` untuk membatasi lebar konten di desktop, meniru tata letak portal properti profesional seperti Rumah123. Berlaku di `ExplorePage`, `PropertyDetailPage`, `ForumPage`, `ForumDetailPage`.
20. Animasi: framer-motion untuk page transition + custom CSS keyframes `slide-up` dan `fadeIn`.

### Pola Kode
21. **Error handling**: Semua async operation (Supabase query) harus dibungkus `try/catch` + cancelled flag di `useEffect` untuk menghindari state update setelah unmount. Untuk count queries, pakai `select('*', { count: 'exact', head: true })` agar hanya fetch metadata tanpa data rows. Contoh: `AdminAnalyticsCards.jsx`.
22. **Lint**: Project pake ESLint dengan aturan `react-hooks/set-state-in-effect` (React 19) dan `react-hooks/static-components` (komponen tidak boleh dibuat di dalam render — ganti dengan regular function call `{myFunc()}` bukan JSX `<MyComp />`). Kalau terpaksa setState di dalam effect, tambah `// eslint-disable-next-line react-hooks/set-state-in-effect`.
23. **Import react-router-dom**: Project pake react-router-dom v7 — `useNavigate`, `useParams`, `Navigate`, `useLocation` masih sama seperti v6.
24. **Protected Route**: `ProtectedRoute` di `App.jsx` — render `<Navigate to="/login" state={{ from }} />` kalau `!isAuth`.
25. **Image error fallback**: Semua `<img>` tag yang menampilkan data dari DB/API harus punya `onError` handler yang set `e.target.src` ke fallback (biasanya `FALLBACK_IMAGE` dari `utils/images.js` atau hardcoded fallback). Berlaku di: `PropertyDetailPage` (semua gallery images), `ExplorePage` (recommendations + listing grid), `ProfileDrawer` (saved thumbnails), `HamburgerMenu` (saved thumbnails).
26. **URL.revokeObjectURL**: Di `SellPropertyPage`, object URL dari `URL.createObjectURL` untuk preview gambar dibersihkan via `useEffect` return cleanup setiap kali `imageFiles` berubah, untuk mencegah memory leak.
27. **RBAC Role**: `profiles.role` menentukan akses admin. `role === 'admin'` memicu: (a) item "Dashboard Admin" di `HamburgerMenu` menu utama, (b) item "Dashboard Admin" di `ProfileDrawer`, (c) badge "Admin Internal" di avatar header kedua drawer, (d) navigasi `/admin`. Role di-fetch via `supabase.from('profiles').select('role')` tiap kali drawer dibuka. Fallback role lain: "Pembeli".
28. **Audit logging**: Setiap tindakan admin yang mengubah data (verify/reject property, change role) harus mencatat ke `audit_logs`. Pola: `insertAuditLog()` dipanggil fire-and-forget (tanpa `await` atau `await` dengan `try/catch` kosong) agar tidak memblokir main operation. `target_detail` JSONB berisi payload kontekstual (`{ property_title, property_price }` untuk property, `{ user_name, old_role, new_role }` untuk user).

### Perubahan Brand & Aset
29. **Brand name**: "HuniOne" (bukan "Vastara"). Muncul di: `TopNavbar` (`<img src="/huniOne.svg">`), `MinimalistLogin` (`<img src="/huniOne.svg">` + "Platform Properti Terpercaya"), `Footer` (`<img src="/huniOne.svg">`), `index.html` title, locale strings, `SellPropertyPage` success message.
30. **Logo asset**: `public/huniOne.svg` — SVG logo dipasang via `<img>` di TopNavbar (h-9 sm:h-10), MinimalistLogin (h-14 sm:h-16), Footer (h-10 sm:h-12). Tidak lagi text-based.
31. **Holding company dihapus**: Semua referensi "PT Vastara Holding Indonesia" sudah dihapus dari Footer (deskripsi, link, copyright). Copyright "© 2026 HuniOne. All rights reserved.".

---

## Ringkasan Perubahan Refactoring

### Bug Fixes
- **CRITICAL**: `ForumPage.handleConfirmDelete` — optimistic delete (`setPosts(prev => prev.filter(...))`) now inside success check. Rollback via spread on catch.
- **HIGH**: `ForumDetailPage.handleConfirmDelete` — `setDeleting(false)` + `setShowDeleteModal(false)` pindah sebelum error check. Navigate tanpa `setTimeout`.
- **HIGH**: `HamburgerMenu.handleLogout` — hapus duplikasi `supabase.auth.signOut()` (onLogout dari App sudah handle).
- **MEDIUM**: `ExplorePage` — hapus dead `loading` state `const [, setLoading] = useState(true)` yang tidak pernah dibaca.

### Code Health (Session #2 — July 2026)
- **`ExplorePage.jsx`**: Added `cancelledRef` to `fetchProperties` to prevent setState after unmount. Removed dead `activeCategory` constant (always `'Semua'`) and its associated dead filter block.
- **`PropertyDetailPage.jsx`**: Extracted `GalleryDesktop`, `GalleryMobile`, `Lightbox`, `AgentCard`, `AccordionBlock` from inside component render to standalone components (React 19 compliance — no components inside render). Switched from function calls `{GalleryDesktop()}` to JSX `<GalleryDesktop />`. Removed unused `getImageSrc` import and orphaned `heroImage` variable.
- **`AdminDashboardPage.jsx`**: Added `cancelledRef` with cleanup effect. Added cancelled checks to `handleVerify` and `handleConfirmReject`.
- **`ProfileDrawer.jsx`**: Added `useRef` + `isMountedRef` cleanup effect. Added mounted checks to `handleSave` after each `await` to prevent setState on unmounted component.
- **`ForumDetailPage.jsx`**: Replaced closure `cancelled` variable with `cancelledRef` ref (also in realtime handler). Added cancelled checks to `fetchPost` and `fetchReplies`.
- **`SellPropertyPage.jsx`**: Wrapped `STEPS` array in `useMemo` to avoid re-construction on every render.
- **`HamburgerMenu.jsx`**: Added comment inside empty `catch {}` to satisfy no-empty rule.

### Code Deduplication
- **`utils/format.js`** — `formatPrice()` dulu inline di 5 file (`ExplorePage`, `PropertyDetailPage`, `SavedPropertiesPage`, `HamburgerMenu`, `MyListingsPage`), sekarang shared.
- **`utils/avatar.js`** — `getAvatarColor()` + `getInitials()` dulu inline di 3 file (`ForumPage`, `ForumDetailPage`, `PropertyDetailPage`), sekarang shared.
- **`utils/time.js`** — `timeAgo()` dulu inline di 2 file (`ForumPage`, `ForumDetailPage`), sekarang shared.
- **`utils/favorites.js`** — `toggleFavorite` ekspor sebagai named export (mengakomodasi `SavedPropertiesPage` yang pakai ejaan Britania).

### Memory & Performance
- **SellPropertyPage**: Hapus `AppToast` komponen lokal + `notification` state — ganti pakai `showToast` dari `useAuth`.
- **SellPropertyPage**: Hapus dead `fetchAgent` effect + `setAgentWa` state (tidak pernah dibaca).
- **SellPropertyPage**: Tambah `useEffect` cleanup untuk `URL.revokeObjectURL` pada preview image.

### Resilience
- **PropertyDetailPage**: Semua `<img>` tags di gallery + lightbox ditambah `onError` fallback ke `FALLBACK_IMAGE`.
- **ExplorePage**: Recommendation images + listing grid images ditambah `onError` fallback.
- **ProfileDrawer**: Saved thumbnail images ditambah `onError` fallback.
- **HamburgerMenu**: Saved thumbnail images ditambah `onError` fallback.

### In-App Realtime Messaging (Session #4 — July 2026)
- **`ChatHubPage.jsx`** — Complete rewrite from static WhatsApp/FAQ list to production-grade realtime direct messaging system. Architecture:
  - **Two-column layout**: Contact list (`w-80`, left) + Chat window (right, `flex-1`). Mobile: toggle view via `showMobileList` state (back button in chat header, contact tap in list).
  - **Contact list**: Built from `direct_messages` (extract unique counterparty IDs) + `profiles` where `role IN ('agent','developer','admin')`. Merged, sorted by last message time DESC. Each contact shows: avatar (initials + getAvatarColor), name, role label, last message preview, timeAgo.
  - **Chat window**: Message history (own = `bg-brand-primary text-white rounded-br-md`, received = `bg-white border rounded-bl-md`), auto scroll-to-bottom via `messagesEndRef`, relative timestamps via `timeAgo`. Empty state + login prompt.
  - **Send message**: Enter key or button click → `supabase.from('direct_messages').insert({ sender_id, receiver_id, content })`. Input disabled during send, spinner on button.
  - **Realtime**: Subscription via `supabase.channel('direct-messages-{userId}').on('postgres_changes', { event: 'INSERT', filter: 'or(sender_id.eq.USER,receiver_id.eq.USER)' })`. On new message: append to messages (if viewing that conversation), update contact list (reorder + preview).
  - **Auth guard**: `LoginPrompt` component shown when `userId` is not available.
  - **Safety**: `cancelledRef` in all effects, try/catch on every Supabase call, eslint-disable for unavoidable `set-state-in-effect` guard clauses.
- **`supabase/migrations/20260727_create_direct_messages.sql`** — DDL for `direct_messages` table + RLS policies (select: sender or receiver, insert: authenticated sender). Realtime must be enabled manually in Supabase dashboard.

### Admin Dashboard Upgrade (Session #3 — July 2026)
- **`AdminDashboardPage.jsx`** — Direfactor ke 3-tab layout: tab bar sticky di header (Overview/Users/Audit). Menyimpan pending properties table di tab Overview + menambahkan analitycs cards di atasnya. Verify dan Reject properti kini otomatis mencatat ke `audit_logs` via `insertAuditLog()` (fire-and-forget, exception-safe).
- **`AdminAnalyticsCards.jsx`** — 4 metric cards di grid `grid-cols-2 lg:grid-cols-4`. Fetch 4 count queries paralel via `Promise.all`. Setiap card: icon lucide di lingkaran dengan warna tematik, count besar (`text-2xl font-extrabold`), label, badge status. Loading: skeleton card.
- **`AdminUserManagement.jsx`** — Table user dari `profiles` dengan inline `<select>` untuk ubah role. Role change: `profiles.update({ role })` → `audit_logs.insert({ action_type: 'change_role', target_detail: { old_role, new_role, user_name } })` → `showToast`. Badge warna berbeda per role (admin=blue, agent/dev=violet, owner=emerald, pembeli=netral). Role dropdown tidak muncul untuk user sendiri? Tidak, tapi user sendiri diberi label "Anda".
- **`AdminAuditLog.jsx`** — Table audit trail 100 entri terbaru DESC. Kolom: Admin (nama), Tindakan (badge warna sesuai jenis), Target (summary dari `target_detail` JSONB — untuk verify/reject tampil `property_title`, untuk change_role tampil `user_name: old → new`), Waktu (`timeAgo`). Empty state: ikon `History` + teks.
- **`audit_logs` table** — Tabel baru untuk audit trail. Setiap admin action (verify, reject, change_role) insert satu baris. Struktur detail di bagian Database Supabase.
- **`supabase/migrations/20260727_create_audit_logs.sql`** — Migration SQL untuk membuat `audit_logs` table + RLS policies (admin select, authenticated insert). Harus dijalankan di Supabase dashboard sebelum fitur audit berfungsi.
- **`SellPropertyPage.jsx`** — (Tidak ada perubahan, sudah `status: 'pending'` di insert payload).
- **`ExplorePage.jsx`** — `fetchProperties()` hanya query `status === 'verified'` (`.eq('status', 'verified')`). Properti `pending` tidak bocor ke publik. Admin lihat properti pending di `/admin`.
- **`TopNavbar.jsx`** — Tombol "Dashboard" (grid icon) navigasi ke `/admin`, ditempatkan sebelum tombol "Jual Properti".
- **`HamburgerMenu.jsx`** — Fetch `role` via `useEffect` tiap drawer terbuka. Jika `role === 'admin'`: item "Dashboard Admin" di menu utama + label header "Admin Internal" (`text-brand-secondary`).
- **`ProfileDrawer.jsx`** — Fetch `role` dari `profiles`. Jika `role === 'admin'`: badge "Admin Internal" + item "Dashboard Admin".

### Purpose-Based System Prompt & Logo SVG (Session #7 — July 2026)
- **`api/groq.js`** & **`vite.config.js`** — `SYSTEM_PROMPTS` map dengan dua entry: `'chat'` (HuniBot, ID, properti-only) dan `'translation'` (EN translator, JSON-only, no markdown). Server baca `req.body.purpose` untuk memilih prompt. Client `system` role selalu di-strip untuk anti prompt injection.
- **`useGroqTranslation.js`** — Request body kirim `purpose: 'translation'` tanpa `system` prompt (karena server sudah tahu dari purpose). Temperature 0.3, max_tokens 2048.
- **`HuniBot.jsx`** — Request body kirim `purpose: 'chat'` eksplisit. Temperature 0.7, max_tokens 1024.
- **`public/huniOne.svg`** — Logo SVG dipasang di TopNavbar, MinimalistLogin, Footer menggantikan text "HuniOne".
- **Color palette updated**: Semua komponen (ExplorePage header gradient, search bar, tabs, verified badge, shortcut icons, property cards, HamburgerMenu, ProfileDrawer, ForumPage cards) migrated ke warna baru: primary #1E3A5F, accent #4A90E2, bg #F8FAFC, border #E5E7EB, muted #6B7280, highlight #EDF4FD, verified #2E8B57, danger #DC2626.
- **`index.css`** — `brand-secondary` diganti `brand-accent` di `@theme`. Old hex `#183B63`/`#4F8FD8` dihapus dari inline SVGs.

### HuniBot Enhancements (Session #5 — July 2026)
- **`HuniBot.jsx`** — Personalisasi greeting: import `useAuth` dari `AuthContext`, extrak `firstName` dari `user?.user_metadata?.first_name`. Greeting title berubah dinamis: jika login → "Halo, {firstName}!", jika tidak → "Halo! Ada yang bisa dibantu?". Subtitle dan quick reply buttons tetap utuh.
- **`HuniBot.jsx`** — Animasi message bubbles: setiap pesan user dan bot dibungkus `<motion.div>` dengan `initial={{ opacity: 0, y: 16, scale: 0.97 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` via `easeOut` 250ms.
- **`HuniBot.jsx`** — System prompt di update: konten baru "Kamu adalah HuniBot, asisten virtual platform properti HuniOne. Jawablah setiap pertanyaan pengguna dengan ramah, profesional, sangat ringkas, padat, dan langsung ke intinya (maksimal 2-3 paragraf pendek). Hindari penjelasan yang bertele-tele." — hanya dikirim ke API Groq, tidak tampil di UI.

### Dynamic EN Translation via Groq (Session #6 — July 2026)
- **`src/hooks/useGroqTranslation.js`** — Hook baru + `batchTranslate` utility. Module-level cache Map + in-flight dedup Map untuk menghindari redundant API calls.
  - `useGroqTranslation(id, fields)` — untuk single property page, return `{ getText, loading }`.
  - `batchTranslate(properties)` — dedup across all visible cards, kirim satu POST ke `/api/groq`.
- **`PropertyDetailPage.jsx`** — Title/address/type diterjemahkan via `useGroqTranslation`. `description_en` ditampilkan langsung saat `lang === 'en'` (static check, fallback ke `description_id`). Spinner saat loading. WhatsApp message localized.
- **`ExplorePage.jsx`** — `useEffect` calls `batchTranslate(displayListings)` saat `lang === 'en'`. `getTranslated(prop, field, fallback)` di recommendation cards + listing grid. Fallback ke teks Indonesia tanpa flicker.

### MoreCategoriesDrawer Swipe-to-Close (Session #6 — July 2026)
- **`MoreCategoriesDrawer.jsx`** — `useDragControls` dari framer-motion. `drag="y"` + `dragConstraints={{ top: 0 }}` + `dragElastic={0.15}`. Drag handle punya `onPointerDown` untuk initiate drag, `touch-none` mencegah scroll conflict. `onDragEnd` tutup drawer jika offset.y > 100 atau velocity.y > 300.

### Security Headers (Session #6 — July 2026)
- **`vercel.json`** — Added CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy (strict-origin-when-cross-origin). CORS headers on `/api/*` restricted to `https://hunione.com`.

### HamburgerMenu Clickable Profile (Session #6 — July 2026)
- **`HamburgerMenu.jsx`** — Profile card (avatar + name + role) changed from `<div>` to `<button>` with `onClick={handleProfile}`. Added `cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200`. Removed duplicate "Informasi Pribadi" MenuItem from Pengaturan section.

### Footer Redesign (Session #6 — July 2026)
- **`Footer.jsx`** — Complete redesign: 5-column grid (brand + Jelajahi + Perusahaan + Bantuan + Legal). New descriptions, updated nav links. "Follow Us" section with Instagram (real link), LinkedIn, TikTok (real link), Facebook. Copyright "© 2026 HuniOne. All rights reserved." Removed all PT Vastara Holding references.

### Logo SVG Integration (Session #8 — July 2026)
- **`public/huniOne.svg`** — Fixed scaling issue: removed hardcoded `width="1920" height="1080"`, added `viewBox="0 0 1920 1080"` so Tailwind `h-*` classes control size properly.
- **TopNavbar**: `<img src="/huniOne.svg">` with `h-20`, responsive.
- **MinimalistLogin**: `<img src="/huniOne.svg">` with `h-32 md:h-48`, centered.
- **Footer**: `<img src="/huniOne.svg">` with `h-20 md:h-24`.

### KPR Calculator Components (Sessions #9-10 — July 2026)

#### KprSimulator.jsx (Reusable widget)
- Self-contained mortgage calculator widget. Props: `initialPrice` (default 900M).
- Standard annuity formula: `M = P * i * (1+i)^n / ((1+i)^n - 1)`.
- State: propertyPrice, dpPercentage, interestRate, tenorYears. DP synced bidirectionally (% ↔ amount). Dp slider 0-50%.
- Edge cases: 0% interest → simple division; principal ≤ 0 → "Lunas"; NaN/Infinity → Rp 0.
- Format: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- Integrated into PropertyDetailPage below description, receives real `property.price`.

#### KprCalculatorPage.jsx (Full page)
- Route: `/kpr` — linked from home quick menu "Kalkulator KPR".
- 2-column desktop layout (left: inputs, right: results), single-column mobile.
- Inputs: Harga Properti (default Rp 1M), DP dual input + slider (0-80%), Suku Bunga (default 5.5%), Tenor select (5-25 tahun).
- Right column: monthly installment card with `AnimatePresence` animation on value change, Rincian Finansial with DP/Pokok progress bar, Tabel Amortisasi (collapsible, yearly breakdown), Estimasi Biaya Lainnya (BPHTB 5%, PPN 11%, Notaris 1%, Provisi 1%) + Total Dana Awal Dibutuhkan.
- Action: WhatsApp consultation (pre-filled message with KPR data) + HuniBot consultation (passes live KPR context via custom event).
- Safe back navigation: `window.history.length > 1` check.

#### PropertyDetailPage Layout Refactor
- **2-column grid**: `grid-cols-1 lg:grid-cols-3 gap-8 mt-8`. Left (lg:col-span-2): title, price, specs, description, KprSimulator, accordions. Right (lg:col-span-1): sticky Agent Card (`sticky top-24`).
- **Agent Card**: Moved from inline to right sidebar. Buttons stacked `flex-col` (full-width, Rumah123 style). Styling: `shadow-md rounded-xl border bg-white p-5`.
- **Smart floating WhatsApp bar**: IntersectionObserver on Agent Card (`rootMargin: '0px 0px 50px 0px'`, `threshold: 0.1`). Hides floating bar via `translate-y-[150%]` when card visible, reappears when scrolled past.
- **KprSimulator**: positioned right after description, receives `initialPrice={property?.price || 900000000}`.

### HuniBot Enhancements (Sessions #8-10 — July 2026)
- **Contextual data from KPR page**: Listens for `open-hunibot-with-context` custom event. On trigger: opens chat, injects contextual greeting with property price, monthly installment, and tenor. Uses `formatCurrency` from shared utils.
- **Route-aware hiding**: On `/kpr` page, only the floating trigger button is hidden (`hidden` class), component stays mounted so chat can receive open events. Uses `useLocation()` from react-router-dom.
- **Shared formatCurrency**: Added `formatCurrency()` function to HuniBot (duplicated from utils to keep standalone).

### Shared Utilities (Session #10 — July 2026)
- **`src/utils/format.js`** — Added `formatCurrency(value)` (Intl.NumberFormat IDR) and `formatShort(value)` (M/Jt suffix). Previously duplicated across KprSimulator, KprCalculatorPage, HuniBot. Now imported from utils.
- Safe navigation pattern: `window.history.length > 1 ? navigate(-1) : navigate('/')`.

### Routing Updates
- **`src/App.jsx`** — Added route `/kpr` → `KprCalculatorPage`. Import added.
- **`src/components/ExplorePage.jsx`** — Quick menu "Kalkulator KPR" path changed from `/coming-soon` to `/kpr`.
