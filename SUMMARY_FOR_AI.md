# Project Vastara — Ringkasan Struktur untuk AI

## Tech Stack
- **Framework**: React 19 + Vite 8
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS v4 (CSS-based config di `src/index.css`)
- **Routing**: react-router-dom v7
- **Auth & Database**: Supabase (RLS, Auth, Realtime)
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
| `/sell-role` | RoleSelectionPage | Ya |
| `/sell` | SellPropertyPage | Ya |
| `/chat` | ChatHubPage | Tidak |
| `/forum` | ForumPage | Tidak |
| `/forum/:id` | ForumDetailPage | Tidak |
| `/property/:id` | PropertyDetailPage | Tidak |
| `/coming-soon` | ComingSoonPage | Tidak |

`ProtectedRoute` redirect ke `/login` jika belum login.

---

## Struktur Folder `src/`

### `components/` — 18 komponen halaman/UI

| File | Fungsi |
|---|---|
| **ExplorePage.jsx** | Halaman utama: hero banner, search, grid properti, filter drawer, rekomendasi, listing lengkap. Filter terhubung ke Supabase. |
| **PropertyDetailPage.jsx** | Detail properti: galeri gambar, spesifikasi, info agen, tombol jadwal survei, fallback NotFoundPage. |
| **SellPropertyPage.jsx** | Form multi-step jual properti: upload gambar, input field, submit ke Supabase. |
| **RoleSelectionPage.jsx** | Onboarding pilih peran (Agent/Developer/Owner) setelah login. |
| **ForumPage.jsx** | Daftar diskusi forum: kartu post dengan avatar, badge kategori, info aktivitas, create post toggle, tombol jawab. |
| **ForumDetailPage.jsx** | Detail post + reply system (quote reply, realtime subscription), CTA login untuk guest. |
| **ChatHubPage.jsx** | Daftar kontak agen/legal untuk dihubungi via WhatsApp. |
| **MinimalistLogin.jsx** | Login/Signup: email/password, Google OAuth, toggle password. |
| **TopNavbar.jsx** | Navbar sticky: logo, language switcher, notifikasi, profil, hamburger menu. |
| **HamburgerMenu.jsx** | Menu slide-out navigasi samping. |
| **ProfileDrawer.jsx** | Drawer profil: info user, edit profil, logout. |
| **NotificationDrawer.jsx** | Drawer notifikasi (grup Today/Yesterday). |
| **MoreCategoriesDrawer.jsx** | Drawer bawah filter kategori properti tambahan. |
| **RescheduleBottomSheet.jsx** | Bottom sheet reschedule janji survei (pilih tanggal & jam). |
| **SavedPropertiesPage.jsx** | Properti tersimpan/favorit user. |
| **ComingSoonPage.jsx** | Placeholder halaman dalam pengembangan. |
| **NotFoundPage.jsx** | Fallback properti tidak ditemukan. |
| **Toast.jsx** | Notifikasi auto-dismiss (success/error/info). |

### `context/` — Global state
- **AuthContext.jsx**: Supabase auth state (`session`, `user`, `loading`, `showToast`, `signOut`). Dibungkus `AuthProvider` di `App.jsx`.

### `data/` — Data dummy
- **dummyProperties.js**: Fallback properti jika fetch Supabase kosong.

### `utils/` — Utilities
- **favorites.js**: Helper favorite (pakai localStorage).

### `locales/` — i18n
- `id/translation.json` — Bahasa Indonesia
- `en/translation.json` — English

### `assets/` — Static
- `fonts/`, `hero.png`, `react.svg`, `vite.svg`

### Root files
- **i18n.js**: Konfigurasi i18next.
- **supabaseClient.js**: Inisialisasi Supabase client.
- **index.css**: Tailwind v4 theme custom colors (brand-primary, secondary, bg, surface, text, muted, border) + custom keyframes (slide-up, fadeIn).

---

## Database Supabase (dari RLS policies)

### Table: `profiles`
- `id` (UUID, PK, references auth.users)
- `first_name`, `email`, `whatsapp`
- RLS: select all, insert/update/delete hanya owner.

### Table: `forum_posts`
- `id` (UUID, PK)
- `author_id` (UUID, FK → profiles.id)
- `title`, `content`
- `created_at`
- RLS: select all, insert/update/delete hanya author.

### Table: `forum_replies`
- `id` (UUID, PK)
- `post_id` (UUID, FK → forum_posts.id)
- `author_id` (UUID, FK → profiles.id)
- `content` (support quoted reply format: `<!--replyto:authorName|snippet-->`)
- `created_at`
- RLS: select all, insert/update/delete hanya author.

### Table: `properties`
- `id` (UUID, PK)
- `seller_id` (UUID, FK → profiles.id)
- `property_type`, `title`, `description`, `price`
- `bedrooms`, `bathrooms`, `sqm`
- `location`, `image_url`
- `status` ('verified' / 'pending')
- RLS: select all, insert/update/delete hanya seller.

---

## Catatan Penting untuk AI

1. **Auth flow**: `useAuth()` dari `AuthContext` mengembalikan `{ session, user, loading, showToast, signOut }`. `user` bisa null saat belum login. Gunakan `session?.user` untuk conditional rendering (lebih reliable).

2. **Filter properties**: `ExplorePage.jsx` menggunakan server-side filtering via Supabase query. Filter dikirim sebagai parameter `filters` ke `fetchProperties()`. Filter client-side hanya untuk `activeCategory`.

3. **Realtime forum**: `ForumDetailPage.jsx` subscribe ke `postgres_changes` on `forum_replies` untuk update balasan secara realtime.

4. **Quoted reply**: Format content reply: `<!--replyto:authorName|snippet-->\npesan`. Diparse oleh fungsi `parseReplyContent()`.

5. **Time format**: `timeAgo(dateString)` — relative time in Indonesian ("baru saja", "5 menit yang lalu", dll).

6. **Avatar**: Tidak ada kolom `avatar_url` di `profiles`. Avatar digenerate dari inisial nama + warna konsisten dari hash user ID (`getAvatarColor()` + `getInitials()`).

7. **Tailwind v4**: Tidak ada `tailwind.config.js`. Konfigurasi theme via CSS `@theme` di `index.css`. Custom colors: `brand-primary`, `brand-secondary`, `brand-bg`, `brand-surface`, `brand-text`, `brand-muted`, `brand-border`.
