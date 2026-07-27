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
| `/admin` | AdminDashboardPage | **Ya** |
| `/coming-soon` | ComingSoonPage | Tidak |

`ProtectedRoute` redirect ke `/login` jika belum login, menyimpan `state.from` untuk redirect balik.

---

## Struktur Folder `src/`

### `components/` — 22 komponen halaman/UI

| File | Fungsi |
|---|---|
| **AdminDashboardPage.jsx** | Backoffice admin: tampilkan properti `status=pending` dalam data table profesional. Kolom: Tanggal, Judul (link ke detail), Harga (`formatPrice`), Penjual (inisial + nama), Kontak (WhatsApp link), Aksi. Tombol hijau "Verifikasi & Terbitkan" → update `status=verified` + hapus dari list. Tombol merah "Tolak" → `ConfirmModal` → `delete` dari DB. `showToast` untuk feedback. Route `/admin` via `ProtectedRoute`. |
| **Footer.jsx** | Mega footer premium: dark background (`bg-brand-primary`), grid 5 kolom (brand + Layanan + Perusahaan + Dukungan + sosial media), container `max-w-7xl`, bottom bar copyright + ikon Instagram/Twitter/LinkedIn (inline SVG). Terpasang di `App.jsx` setelah routing. |
| **ExplorePage.jsx** | Halaman utama: hero banner, search, grid properti, filter drawer (server-side via Supabase), rekomendasi, listing lengkap. `fetchProperties()` menerima `filters` object. Thumbnail pakai `getImageSrc(p.image_url)` dari `utils/images.js` untuk backward compatibility (single string or JSON array). |
| **PropertyDetailPage.jsx** | Detail properti: **GalleryDesktop** (Airbnb-style: 1 main large + 2x2 grid) sembunyi di `lg:block`, **GalleryMobile** (`<lg`: hero aspect-[4/3] + 4-thumb grid `grid-cols-4 gap-0.5`, thumb ke-4 overlay "Lihat Semua" jika >5 gambar, filler `bg-brand-border` untuk <4 gambar). Mobile CTA `bg-red-50` "Hubungi Pengiklan Segera". Agent Card (avatar inisial + warna hash dari `seller_id`, nama dari `profiles.first_name` via join query, role dari `profiles.role`, 2-col grid Phone outline + WhatsApp green-solid). Accordion "Panduan Membeli Properti" + "Disclaimer". Guard `if (!id)` + fallback column names. |
| **SellPropertyPage.jsx** | Form multi-step (5 step) jual properti: pilih peran, **multi-image upload** (maks 10 foto, preview grid 3-4 kolom dengan thumbnail + tombol X hapus per file + tombol "Tambah"), upload paralel via `Promise.all()` ke storage `PROPERTIES_IMAGE`, `image_url` disimpan sebagai `JSON.stringify([url1, url2, ...])`. Notifikasi pakai `showToast` dari `useAuth` (bukan komponen lokal `AppToast`). Ada `useEffect` cleanup untuk `URL.revokeObjectURL` pada preview. |
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
- **favorites.js**: Helper favorite (pakai localStorage): `getFavorites()`, `toggleFavorite(id)`, `isFavorite(id)`, `clearFavorites()`. `toggleFavorite` adalah alias dari `toggleFavourite` — keduanya bisa dipakai untuk menghindari typo Britania/AS.
- **images.js**: Helper multi-image: `parseImages(imageUrl)` → array of URLs (handle single string, JSON array, atau array literal). `getImageSrc(imageUrl)` → URL pertama atau fallback Unsplash. `FALLBACK_IMAGE` (Unplash) — konstanta yang juga bisa dipakai di komponen untuk `onError` fallback.
- **format.js**: `formatPrice(value)` — format harga ke Rp dengan suffix M/Jt. Dulu inline di 5 file, sekarang reusable.
- **avatar.js**: `getAvatarColor(id)` + `getInitials(name)` — warna konsisten dari hash UUID + inisial dari `first_name`. Dulu inline di 3 file.
- **time.js**: `timeAgo(dateString)` — relative time in Indonesian. Dulu inline di 2 file.

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
18. **Tailwind v4**: Tidak ada `tailwind.config.js`. Konfigurasi theme via CSS `@theme` di `index.css`. Custom colors: `brand-primary` (#183B63), `brand-secondary` (#4F8FD8), `brand-bg` (#EEF3F7), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#66788A), `brand-border` (#D6DEE7).
19. **Desktop layout**: Halaman memakai `max-w-7xl mx-auto` untuk membatasi lebar konten di desktop, meniru tata letak portal properti profesional seperti Rumah123. Berlaku di `ExplorePage`, `PropertyDetailPage`, `ForumPage`, `ForumDetailPage`.
20. Animasi: framer-motion untuk page transition + custom CSS keyframes `slide-up` dan `fadeIn`.

### Pola Kode
21. **Error handling**: Semua async operation (Supabase query) harus dibungkus `try/catch` + cancelled flag di `useEffect` untuk menghindari state update setelah unmount.
22. **Lint**: Project pake ESLint dengan aturan `react-hooks/set-state-in-effect` (React 19) dan `react-hooks/static-components` (komponen tidak boleh dibuat di dalam render — ganti dengan regular function call `{myFunc()}` bukan JSX `<MyComp />`). Kalau terpaksa setState di dalam effect, tambah `// eslint-disable-next-line react-hooks/set-state-in-effect`.
23. **Import react-router-dom**: Project pake react-router-dom v7 — `useNavigate`, `useParams`, `Navigate`, `useLocation` masih sama seperti v6.
24. **Protected Route**: `ProtectedRoute` di `App.jsx` — render `<Navigate to="/login" state={{ from }} />` kalau `!isAuth`.
25. **Image error fallback**: Semua `<img>` tag yang menampilkan data dari DB/API harus punya `onError` handler yang set `e.target.src` ke fallback (biasanya `FALLBACK_IMAGE` dari `utils/images.js` atau hardcoded fallback). Berlaku di: `PropertyDetailPage` (semua gallery images), `ExplorePage` (recommendations + listing grid), `ProfileDrawer` (saved thumbnails), `HamburgerMenu` (saved thumbnails).
26. **URL.revokeObjectURL**: Di `SellPropertyPage`, object URL dari `URL.createObjectURL` untuk preview gambar dibersihkan via `useEffect` return cleanup setiap kali `imageFiles` berubah, untuk mencegah memory leak.
27. **Admin Dashboard** (`/admin`): Data table pending properties dengan join `profiles(first_name, whatsapp)`. Verify → `update({ status: 'verified' })` + hapus baris dari state. Reject → `ConfirmModal` → `delete().eq('id', id)`. Navigasi: tombol "Dashboard" di `TopNavbar` (sebelah tombol "Jual Properti").

### Perubahan Brand
28. **Brand name**: "HuniOne" (bukan "Vastara"). Muncul di: `TopNavbar` logo, `MinimalistLogin` heading, `index.html` title, locale strings, `SellPropertyPage` success message.
29. **Perusahaan**: PT Vastara Holding Indonesia (group ecosystem).

---

## Ringkasan Perubahan Refactoring

### Bug Fixes
- **CRITICAL**: `ForumPage.handleConfirmDelete` — optimistic delete (`setPosts(prev => prev.filter(...))`) now inside success check. Rollback via spread on catch.
- **HIGH**: `ForumDetailPage.handleConfirmDelete` — `setDeleting(false)` + `setShowDeleteModal(false)` pindah sebelum error check. Navigate tanpa `setTimeout`.
- **HIGH**: `HamburgerMenu.handleLogout` — hapus duplikasi `supabase.auth.signOut()` (onLogout dari App sudah handle).
- **MEDIUM**: `ExplorePage` — hapus dead `loading` state `const [, setLoading] = useState(true)` yang tidak pernah dibaca.

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

### Admin Verification Workflow
- **`AdminDashboardPage.jsx`** — Halaman baru `/admin` (ProtectedRoute). Data table properti `pending` dengan join `profiles`. Tombol: Verify (`update status=verified` + hapus dari list) dan Reject (`ConfirmModal` + `delete`). `showToast` untuk semua feedback.
- **`SellPropertyPage.jsx`** — (Tidak ada perubahan, sudah `status: 'pending'` di insert payload).
- **`ExplorePage.jsx`** — `fetchProperties()` ganti dari `.in('status', ['verified', 'pending'])` → `.eq('status', 'verified')` agar properti pending tidak bocor ke publik.
- **`TopNavbar.jsx`** — Tombol "Dashboard" (grid icon) navigasi ke `/admin`, ditempatkan sebelum tombol "Jual Properti".
