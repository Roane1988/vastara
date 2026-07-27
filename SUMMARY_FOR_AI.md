# Project HuniOne — Ringkasan Struktur untuk AI

Platform properti (jual/beli/sewa) dengan forum diskusi komunitas.

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
- **Map**: leaflet + react-leaflet

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
| `/coming-soon` | ComingSoonPage | Tidak |

`ProtectedRoute` redirect ke `/login` jika belum login, menyimpan `state.from` untuk redirect balik.

---

## Struktur Folder `src/`

### `components/` — 21 komponen halaman/UI

| File | Fungsi |
|---|---|
| **Footer.jsx** | Mega footer premium: dark background (`bg-brand-primary`), grid 5 kolom (brand + Layanan + Perusahaan + Dukungan + sosial media), container `max-w-7xl`, bottom bar copyright + ikon Instagram/Twitter/LinkedIn (inline SVG). Terpasang di `App.jsx` setelah routing. |
| **ExplorePage.jsx** | Halaman utama: hero banner, search, grid properti, filter drawer (server-side via Supabase), rekomendasi, listing lengkap. `fetchProperties()` menerima `filters` object. Thumbnail pakai `getImageSrc(p.image_url)` dari `utils/images.js` untuk backward compatibility (single string or JSON array). |
| **PropertyDetailPage.jsx** | Detail properti: **GalleryDesktop** (Airbnb-style: 1 main large + 2x2 grid) sembunyi di `lg:block`, **GalleryMobile** (`<lg`: hero aspect-[4/3] + 4-thumb grid `grid-cols-4 gap-0.5`, thumb ke-4 overlay "Lihat Semua" jika >5 gambar, filler `bg-brand-border` untuk <4 gambar). Mobile CTA `bg-red-50` "Hubungi Pengiklan Segera". Agent Card (avatar inisial + warna hash dari `seller_id`, nama dari `profiles.first_name` via join query, role dari `profiles.role`, 2-col grid Phone outline + WhatsApp green-solid). Accordion "Panduan Membeli Properti" + "Disclaimer". Guard `if (!id)` + fallback column names. |
| **SellPropertyPage.jsx** | Form multi-step (5 step) jual properti: pilih peran, **multi-image upload** (maks 10 foto, preview grid 3-4 kolom dengan thumbnail + tombol X hapus per file + tombol "Tambah"), upload paralel via `Promise.all()` ke storage `PROPERTIES_IMAGE`, `image_url` disimpan sebagai `JSON.stringify([url1, url2, ...])`. Inline notification (`AppToast`) + success state. |
| **MyListingsPage.jsx** | Daftar properti milik user sendiri (fetch by `seller_id`). Status badge "Menunggu Verifikasi" / "Terverifikasi". |
| **RoleSelectionPage.jsx** | Onboarding pilih peran (Agent/Developer/Owner) setelah login. |
| **ForumPage.jsx** | Daftar diskusi forum: kartu post dengan avatar (inisial + warna hash), badge "Umum", info aktivitas (replies count + avatar stack), compose form collapse toggle. |
| **ForumDetailPage.jsx** | Detail post + reply system: avatar inisial, OP badge, upvote button (`ThumbsUp`), quote reply (`<!--replyto:...-->`), realtime subscription ke `forum_replies`, relative time (`timeAgo`), sticky reply form, guest CTA. |
| **ChatHubPage.jsx** | Daftar kontak agen/legal untuk dihubungi via WhatsApp. |
| **ConfirmModal.jsx** | Modal konfirmasi reusable untuk aksi destruktif (hapus post forum, dll). Animasi framer-motion `AnimatePresence`, backdrop blur, tombol Batal + Konfirmasi (merah). Dipakai di `ForumPage` dan `ForumDetailPage`. |
| **MinimalistLogin.jsx** | Login/Signup: email/password, Google OAuth (`supabase.auth.signInWithOAuth`), toggle password visibility. |
| **TopNavbar.jsx** | Navbar sticky: logo "HuniOne", language switcher, notifikasi, profil, hamburger menu. |
| **HamburgerMenu.jsx** | Menu slide-out navigasi samping dengan daftar favorit. |
| **ProfileDrawer.jsx** | Drawer profil: info user, edit profil (first_name, email, whatsapp), saved properties, logout. Ada 2 efek: fetch saved + fetch profile. |
| **NotificationDrawer.jsx** | Drawer notifikasi (grup Today/Yesterday). |
| **MoreCategoriesDrawer.jsx** | Drawer bawah filter kategori properti tambahan. |
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
- **favorites.js**: Helper favorite (pakai localStorage): `getFavorites()`, `toggleFavorite(id)`, `isFavorite(id)`.
- **images.js**: Helper multi-image: `parseImages(imageUrl)` → array of URLs (handle single string, JSON array, atau array literal). `getImageSrc(imageUrl)` → URL pertama atau fallback Unsplash. Dipakai di ExplorePage, PropertyDetailPage, SavedPropertiesPage, HamburgerMenu, ProfileDrawer, MyListingsPage.

### `locales/`
- `id/translation.json` — Bahasa Indonesia (238 baris)
- `en/translation.json` — English (238 baris)

### Root files
- **i18n.js**: Konfigurasi i18next dengan deteksi bahasa browser.
- **supabaseClient.js**: Inisialisasi Supabase client + validasi env var.
- **index.css**: Tailwind v4 theme (`@theme`) + custom keyframes + `no-scrollbar` utility.

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
- `description_id`, `address`
- `bedrooms`, `bathrooms`, `area_sqm` (int, **bukan** `sqm`)
- `image_url` (TEXT — bisa single URL string legacy atau `JSON.stringify([url1, url2, ...])` untuk multi-image. Parsing via `utils/images.js:parseImages()`)
- `seller_whatsapp`
- `status` ('verified' / 'pending')
- `created_at`
- RLS: select all, insert/update/delete hanya seller.

### Storage: `PROPERTIES_IMAGE` (bucket)
- Untuk upload gambar properti dari `SellPropertyPage.jsx`.
- File path: `{userId}-{timestamp}-{sanitizedFileName}`
- Public URL via `getPublicUrl()`.
- Perlu RLS policy untuk INSERT (authenticated) + SELECT (public) agar bisa upload & tampilkan gambar.

---

## Catatan Penting untuk AI

### Auth
1. `useAuth()` dari `AuthContext` mengembalikan `{ session, user, loading, showToast, signOut }`. `user` bisa `null` saat belum login. Gunakan `session?.user` untuk conditional yang lebih reliable (soalnya `session.user` lebih stabil daripada `user`).
2. `signOut` harus panggil `await supabase.auth.signOut()` dulu baru `navigate()`.
3. Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### Properties
4. **Nama kolom**: properties pakai `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`). Semua component sudah punya fallback `??` untuk backward compatibility.
5. **Multi-image**: `image_url` sekarang menyimpan array JSON `JSON.stringify([url1, url2, ...])`. `parseImages(imageUrl)` dari `utils/images.js` handle backward compatibility (single string, JSON array, atau array literal). `getImageSrc(imageUrl)` ambil URL pertama untuk thumbnail. Dipakai di: ExplorePage (thumbnails), PropertyDetailPage (gallery), SavedPropertiesPage, HamburgerMenu, ProfileDrawer, MyListingsPage.
6. **SellProperty upload**: Maks 10 foto, preview grid dengan tombol Hapus (X) per file + tombol "Tambah" untuk menambah. Upload paralel via `Promise.all()`. Kolom `image_url` diisi `JSON.stringify(urls)`.
7. Filter properties di `ExplorePage` via server-side Supabase query (`.eq()`, `.gte()`, `.lte()`, `.limit()`, `.range()`). Hanya `activeCategory` yang client-side.
8. **BELUM ada pagination** di `ExplorePage` dan `ForumPage` — query fetch **semua** data tanpa `.limit()`.
9. **PropertyDetail gallery**: `GalleryDesktop()` (Airbnb-style grid, sembunyi di `<lg`) + `GalleryMobile()` (hero aspect-[4/3] + 4-thumb grid, thumb ke-4 overlay "Lihat Semua" jika >5 gambar). Semua image + overlay "Lihat Semua" bisa diklik → `openLightbox(index)`. Menggunakan `parseImages(property.image_url)`.
10. **Lightbox**: Fullscreen modal `z-[100] bg-black` — header dengan tombol Close (`X`) + counter "N / total", image `object-contain` di tengah, navigasi prev/next (`ChevronLeft`/`ChevronRight`). Keyboard: Escape=tutup, ArrowLeft/Right=navigasi. Body scroll di-lock via `document.body.style.overflow='hidden'`.
11. **Agent Card**: Query properties dengan join `profiles(first_name, role)`. Seller avatar: inisial dari `profiles.first_name` + warna hash dari `seller_id`. Role: agent/developer/owner → "Agen Properti"/"Pengembang"/"Pemilik Langsung".
12. **Mobile CTA**: `bg-red-50 border-red-200 text-red-700` — "Hubungi Pengiklan Segera".
13. **Accordion**: "Panduan Membeli Properti" (6 langkah) + "Disclaimer" (teks legal). State via objek `accordionState`.

### Forum
14. Format quoted reply: `<!--replyto:authorName|snippet-->\npesan_baru`. Diparse oleh `parseReplyContent()`.
15. Realtime: `ForumDetailPage` subscribe ke `postgres_changes` INSERT on `forum_replies` — update daftar balasan otomatis tanpa refresh.
16. `timeAgo(dateString)` — relative time in Indonesian ("baru saja", "5 menit yang lalu", dll).
17. Avatar tidak pakai `avatar_url` — inisial dari `first_name` + warna konsisten dari hash `UUID user` (`getAvatarColor()` + `getInitials()`).

### Styling
18. **Tailwind v4**: Tidak ada `tailwind.config.js`. Konfigurasi theme via CSS `@theme` di `index.css`. Custom colors: `brand-primary` (#183B63), `brand-secondary` (#4F8FD8), `brand-bg` (#EEF3F7), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#66788A), `brand-border` (#D6DEE7).
19. **Desktop layout**: Halaman memakai `max-w-7xl mx-auto` untuk membatasi lebar konten di desktop, meniru tata letak portal properti profesional seperti Rumah123. Berlaku di `ExplorePage`, `PropertyDetailPage`, `ForumPage`, `ForumDetailPage`.
20. Animasi: framer-motion untuk page transition + custom CSS keyframes `slide-up` dan `fadeIn`.

### Pola Kode
21. **Error handling**: Semua async operation (Supabase query) harus dibungkus `try/catch` + cancelled flag di `useEffect` untuk menghindari state update setelah unmount.
22. **Lint**: Project pake ESLint dengan aturan `react-hooks/set-state-in-effect` (React 19) dan `react-hooks/static-components` (komponen tidak boleh dibuat di dalam render — ganti dengan regular function call `{myFunc()}` bukan JSX `<MyComp />`). Kalau terpaksa setState di dalam effect, tambah `// eslint-disable-next-line react-hooks/set-state-in-effect`.
23. **Import react-router-dom**: Project pake react-router-dom v7 — `useNavigate`, `useParams`, `Navigate`, `useLocation` masih sama seperti v6.
24. **Protected Route**: `ProtectedRoute` di `App.jsx` — render `<Navigate to="/login" state={{ from }} />` kalau `!isAuth`.

### Perubahan Brand
25. **Brand name**: "HuniOne" (bukan "Vastara"). Muncul di: `TopNavbar` logo, `MinimalistLogin` heading, `index.html` title, locale strings, `SellPropertyPage` success message.
26. **Perusahaan**: PT Vastara Holding Indonesia (group ecosystem).
