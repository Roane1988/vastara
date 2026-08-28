# HuniOne — Ringkasan Proyek untuk Gemini AI

Platform properti (jual/beli/sewa) dengan AI chatbot, realtime chat (read receipt), forum komunitas, bandingkan properti, **direktori agen publik**, pendaftaran agen, **dukungan properti sewa penuh**, **lapor iklan**, admin dashboard. Deploy di Vercel (SPA + serverless) — domain **hunione.com**. Pembaruan terakhir: 28 Agustus 2026.

## Changelog — Hapus Fitur Tren & Perubahan Harga (Tren Harga / Turun Harga) (28 Agustus 2026)
- **Landing (ExplorePage)**: hapus shortcut "Turun Harga" & "Tren Harga" dari **Layanan cepat** (QUICK_MENU) dan dari **sticky search bar**; grid quick services di-balance `grid-cols-4 sm:grid-cols-8` → `grid-cols-5` (5 item simetris di mobile & desktop). Import tak terpakai `TrendingUp`/`TrendingDown` dibersihkan.
- **ExploreInsights**: hapus section **Market Pulse** (median harga per kota, link `/price-trends`) & collection **"Baru Turun Harga"** (link `/price-drop`) beserta component `MarketPulse`, fungsi `median`, `MIN_CITY_LISTINGS`, dan import `TrendingUp`/`Flame`/`isRentalProperty`. Logika `drops`/`dropIds` tetap dipakai untuk dedupe row "Rumah Pertama"/premium; badge "Turun Harga" per-kartu tetap.
- **Navigasi lain**: hapus entri "Tren Harga"/"Turun Harga" dari `MoreCategoriesDrawer` (TOP_SERVICES jadi 3 item → grid `grid-cols-3`; section "Alat & Fitur" tinggal "Pencarian Tersimpan") dan link "Tren Harga" di `ProfileDrawer`.
- **Route & komponen**: hapus `PriceDropPage` & `PriceTrendPage` (file dihapus) dan route `/price-drop` & `/price-trends` dari `App.jsx`; hapus kunci i18n `quick_menu.price_drop` & `price_trends` (id/en).
- **Dipertahankan**: guard harga backend (`guard_property_price_change()`, `original_price`, `price_history`, tab "Harga" admin) tetap ada — hanya UI/landing-page tren & penurunan harga yang dihapus.

## Changelog — Redesign Halaman Pilih Peran `/sell-role` (RoleSelectionPage) (28 Agustus 2026)
- **Layout role cards**: dari tumpukan vertikal 1 kolom menjadi **grid rapi** — 3 kolom sejajar di desktop (`md:grid-cols-3`) & 1 kolom proporsional di mobile (`grid-cols-1`). Hero card (owner/agent/developer) memakai container rounded `rounded-2xl`, `bg-white`, border tipis `border-brand-border`, dan **hover interaktif** (`-translate-y-1`, `hover:border-brand-accent`, `hover:shadow-lg`).
- **Ikon & hierarki visual**: ikon diperbesar (`w-16 h-16`, `size={30}`) dalam kotak `bg-brand-accent/10` yang berubah menjadi `brand-primary` + putih saat hover; judul peran tebal (`font-bold`) diikuti **deskripsi singkat** di bawahnya (string i18n baru `roleSelection.*_desc` untuk owner/agent/developer/find_agent, ID & EN).
- **Card sekunder "Cari Agen"**: dibuat terpisah sebagai card full-width bergaya dashed/ghost di bawah grid (navigasi `/agents`), mengikuti konvensi portal — peran yang mengiklankan sebagai CTA utama, mencari agen sebagai aksi sekunder.
- **Fungsionalitas dipertahankan**: routing & state handling tak berubah — tiga peran utama tetap `navigate('/sell', { state: { role } })`, "Cari Agen" tetap `navigate('/agents')`; tombol back `navigate(-1)` tetap.

## Changelog — Alur Lupa & Ubah Kata Sandi End-to-End (25 Agustus 2026)
- **ForgotPasswordPage** (`/forgot-password`, `src/pages/ForgotPasswordPage.jsx`): form email → `resetPasswordForEmail` (Supabase Auth) → state sukses dengan instruksi cek email. Route public, lazy-loaded.
- **UpdatePasswordPage** (`/update-password`, `src/pages/UpdatePasswordPage.jsx`): form password baru (konfirmasi) → `updateUser({ password })` → redirect ke `/`; validasi kekuatan password (min 8 + huruf besar/kecil + angka) & inline errors.
- **MinimalistLogin**: tambah link **"Lupa kata sandi?"** di bawah kolom password → `/forgot-password`.
- **Route** `src/App.jsx`: `/forgot-password` & `/update-password` (public, `React.lazy`).
- **Rate-limit 429** ditangani via `isRateLimitError` di kedua halaman (toast `login.too_many_attempts`).
- **i18n**: namespace lengkap ID/EN untuk kedua halaman.

## Changelog — Hapus Hero Activity Card & Section Kepercayaan HuniOne (8 Agustus 2026)
- **Hapus Hero Activity Card & statistik hidup** di `ExplorePage.jsx` (`19d3f22`): kartu statistik real-time (properti baru/harga turun/agen/diskusi) beserta seluruh state & query Supabase yang menghitungnya dihapus.
- **Hapus section "Kepercayaan HuniOne" & statistik live** di `ExploreInsights.jsx` (`4aff793`): trust bar (Properti/Kota/100% Terverifikasi) + data statistik langsung dihapus.
- Efek: listing utama tidak lagi terbebani fetch statistik yang tidak ditampilkan; halaman lebih ringan dan fokus ke properti.

## Changelog — Fix Tombol "Tambahkan Sekarang" Banner WhatsApp (28 Agustus 2026)
- **Bug**: tombol "Tambahkan Sekarang" di `WhatsAppVerificationBanner.jsx` tidak bisa diklik — `onClick` hanya `setWhatsapp('')` (tidak berguna), dan form input hanya tampil saat `whatsapp_verified === false` (bukan saat `null`/belum diisi).
- **Fix**: tambah state `showInput`; tombol kini `setShowInput(true)` yang membuka (expand) kolom input + tombol "Simpan & Verifikasi" di dalam banner; `showForm = showInput || whatsapp_verified === false`; input diberi `autoFocus`.
- **UX**: wrapper `z-index` naik `z-40` → `z-50`; tombol diberi `cursor-pointer`, `hover:bg-brand-primary/90`, `transition-colors`, `disabled:cursor-not-allowed`.

## Changelog — Hardening WhatsApp: UNIQUE, Validasi Backend, Reset Verified (29 Agustus 2026)
- **Partial UNIQUE index** (`20260829_whatsapp_verification_hardening.sql`): `profiles.whatsapp` unik untuk nilai non-empty → mencegah satu nomor dipakai banyak akun. NULL/empty tetap diizinkan banyak.
- **Validasi & normalisasi backend** di RPC `set_whatsapp_verified`: regexp ambil digit, cek panjang 10-14, normalisasi awalan `08/620 → 62`, tolak duplikat nomor akun lain (raise exception). Frontend tidak bisa di-bypass.
- **#10 Reset verified saat ganti nomor** (`ProfileDrawer.jsx`): `handleSave` menyetel `whatsapp_verified` berdasarkan `waChanged` (bandingkan dengan `currentWhatsapp` yang tersimpan). Nomor sama → `true`; nomor berubah/dikosongkan → `false` (user harus verifikasi ulang via banner). Setelah simpan, `refreshProfile(user.id)` (metode baru diekspos dari `AuthContext`) sinkron `profile` dari DB, menggantikan tebakan `setWhatsappVerified`.
- **AuthContext**: ekspos `refreshProfile` di context value.
- Efek: satu akun satu nomor; pergantian nomor memaksa verifikasi ulang; banner persisten konsisten dengan status DB.

## Changelog — Fix Banner WhatsApp Muncul Lagi Setelah Refresh (Root Cause) (28 Agustus 2026)
- **Root cause sebenarnya**: `get_my_profile()` berjenis `returns table(...)` → PostgREST mengembalikan **array**, bukan objek. `AuthContext.fetchProfile` menyimpan `setProfile(data)` (array), sehingga `profile?.whatsapp_verified` selalu `undefined` → banner verifikasi selalu ditampilkan setelah refresh (walau hilang sesaat saat klik karena `setWhatsappVerified` mengubah profile jadi objek).
- **Fix**: normalisasi hasil RPC ke objek di semua konsumen:
  - `AuthContext.fetchProfile`: `const p = Array.isArray(data) ? data[0] : data; setProfile(p)`.
  - `ProfileDrawer`: `const myProfile = Array.isArray(myProfileData) ? myProfileData[0] : myProfileData` (email/whatsapp kini benar termuat dari DB, tak hanya fallback metadata).
  - `SellPropertyPage` (prefill WhatsApp): normalisasi yang sama.
- Dampak: `profile.whatsapp_verified` kini boolean nyata dari DB → banner hilang permanen setelah verifikasi tersimpan.

## Changelog — Perkuat Simpan & Verifikasi Banner WhatsApp (28 Agustus 2026)
- `WhatsAppVerificationBanner.jsx` `handleSave`: sudah memanggil RPC `set_whatsapp_verified(normalized)` (menulis `whatsapp` + `whatsapp_verified=true` ke DB) → `setWhatsappVerified(normalized)` agar state global sinkron & banner hilang seketika.
- **Error handling diperkuat**: `rpcErr` dan `catch` kini memanggil `showToast(msg,'error')` selain `setError` inline; sukses memanggil `showToast(success,'success')`.
- **Catatan penting**: agar data benar masuk DB, migration `20260828_whatsapp_verification.sql` (termasuk RPC `set_whatsapp_verified`) **wajib sudah dijalankan di Supabase** — jika tidak, RPC error "function does not exist" dan banner tetap muncul (bukan bug kode frontend).

## Changelog — Fix Tombol "Simpan Perubahan" Akun (28 Agustus 2026)
- **Bug**: tombol "Simpan Perubahan" di `ProfileDrawer.jsx` tidak merespon karena `isSaveDisabled` mematikan tombol saat field kosong/email tidak valid (`saving || !name || !email || emailInvalid || ...`), dan `handleSave` berhenti diam-diam (`return`) tanpa feedback.
- **Fix**: `isSaveDisabled` kini hanya `saving` → tombol selalu bisa diklik dan kasih feedback. `handleSave` mengganti silent return dengan `notify(..., 'error')` eksplisit: `name_required`, `email_required`, `email_invalid`, `whatsapp_invalid` (validasi WhatsApp pakai `isValidWhatsAppNumber`), `password_required`.
- **Normalisasi**: nomor WhatsApp dinormalisasi (`normalizeWhatsAppNumber`) sebelum simpan ke `auth.user.user_metadata` & `profiles.whatsapp`.
- **Toast**: saat sukses memanggil `showToast(save_success, 'success')` (global) + `notify` inline; loading state (spinner `Loader2` + "Menyimpan...") & disabled tetap.
- **Sinkronisasi state** (`d80cf23` →): setelah simpan sukses, `handleSave` memanggil `setWhatsappVerified(normalizedWa)` (dari `useAuth()`) agar `AuthContext.profile.whatsapp` langsung sinkron + `whatsapp_verified=true`, tidak hanya bergantung pada Realtime (mencegah UI banner menampilkan nilai basi sesaat). Konsisten dgn backfill verifikasi berbasis kepemilikan nomor.
- **Fix persistensi banner setelah refresh**: payload `supabase.from('profiles').update({...})` di `handleSave` kini menyertakan `whatsapp_verified: true` saat `normalizedWa` tidak kosong → setelah refresh DB mengembalikan `true`, banner verifikasi tidak muncul lagi (sebelumnya hanya state memory/Realtime, bukan DB).
- i18n baru (ID & EN): `profileDrawer.name_required`, `email_required`, `whatsapp_invalid`.

## Changelog — Placeholder & Bantuan Format WhatsApp Seragam (28 Agustus 2026)
- **Placeholder standar `+62 812-3456-7890`** pada semua input WhatsApp (`<input type="tel">`): `MinimalistLogin` (registrasi), `ProfileDrawer`, `AgentProfilePage`, `AgentApplicationPage`, `WhatsAppVerificationBanner`. Pengecualian `SellPropertyPage` yang punya prefix visual `+62` → placeholder `812 3456-7890` (gabungan = `+62 812 3456-7890`).
- **Helper text di bawah input**: "Gunakan format internasional (misal: +62812...)" di semua form WhatsApp (i18n ID & EN). `ProfileDrawer` memakai hint lama, `SellPropertyPage` menggabung dengan catatan kontak pembeli/penyewa.
- **Normalisasi seragam** (`src/utils/whatsapp.js` baru): `normalizeWhatsAppNumber()` terima awalan `08`/`62`/`+62` → konversi ke format `62` (strip non-digit, ganti `0` awal → `62`). `isValidWhatsAppNumber()` (regex 08/62/+62, 10-14 digit). Dipakai di `MinimalistLogin` (validasi + signup) & `WhatsAppVerificationBanner`.
- i18n baru/update (ID & EN): `login.whatsapp_hint`, `agentApply.whatsapp_hint`/`whatsapp_placeholder`, `agentProfile.whatsapp_hint`/`whatsapp_placeholder`, `whatsappVerify.hint`; update `*_placeholder` ke `+62 812-3456-7890`.

## Changelog — Verifikasi WhatsApp Wajib & Pengingat Persisten (28 Agustus 2026)
- **Verifikasi WhatsApp wajib** (migration `20260828_whatsapp_verification.sql`): kolom baru `whatsapp_verified` (bool, default false) di tabel `profiles`.
  - Trigger `handle_new_user()` di-update: saat signup, profil dibuat dengan `whatsapp_verified = true` bila nomor WhatsApp diisi, `false` bila kosong.
  - **Backfill**: user lama yang sudah punya nomor WhatsApp dianggap terverifikasi (tidak memaksa verifikasi ulang).
  - RPC `get_my_profile()` diperluas mengembalikan `whatsapp_verified`; RPC baru `set_whatsapp_verified(p_whatsapp text)` (security definer, owner-only) untuk menyimpan nomor + menandai terverifikasi.
- **Banner/reminder persisten** (`WhatsAppVerificationBanner.jsx`, di-render global di `App.jsx` di bawah TopNavbar): muncul di semua halaman saat user login & `whatsapp_verified !== true`. **Tidak bisa ditutup** (persisten). Menampilkan form input nomor WhatsApp + tombol "Simpan & Verifikasi" (validasi regex 08/62/+62 10-14 digit → RPC `set_whatsapp_verified` → hilang setelah terverifikasi).
- **AuthContext** (`src/context/AuthContext.jsx`): tambah state `profile` (dari RPC `get_my_profile()`), diekspos via `useAuth()` beserta `setWhatsappVerified` (update lokal setelah verifikasi) & watcher Realtime `profiles` yang juga membaca `whatsapp_verified`/`whatsapp`.
- **Registrasi** (`MinimalistLogin.jsx`): metadata signup eksplisit `whatsapp_verified: false` (konsisten dgn trigger).
- i18n baru (ID & EN): key `whatsappVerify.*` (title, subtitle, placeholder, verify, add, saving, invalid, success, failed).

## Changelog — Validasi Input, Penyembunyian KPR, NIB Agen, Sinkronisasi Role, Prompt HuniBot (26 Agustus 2026)
- **Validasi kekuatan password** (`1424b00` → `3b4b017`): aturan baru password min 8 karakter + 1 huruf besar + 1 huruf kecil + 1 angka (regex `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`). Diterapkan di `MinimalistLogin.jsx` (registrasi) & `UpdatePasswordPage.jsx` (reset). i18n baru: `login.error_password_weak`, `login.error_whatsapp_invalid`, `update_password.password_weak` (ID & EN).
- **Validasi nomor WhatsApp**: harus diawali `08`/`62`/`+62`, digit saja, panjang 10–14 digit (regex `/^(08|62|\+62)\d{8,12}$/`). Nomor dinormalisasi (strip non-digit) sebelum `signUp`.
- **Inline field errors** (bukan native HTML5): tambah `noValidate` ke form, hapus `minLength` dari input password, validasi berbasis state React per-field (password, confirm, whatsapp) dengan **border merah + `text-red-500`** di bawah input; error terhapus saat mengetik; form register & login switch mereset error field.
- **KPR disembunyikan dari UI** (`3e4b930` + `f4def92` — sementara): fitur KPR di-sembunyikan dari antarmuka, tetapi **mesin perhitungan (`KprSimulator.jsx`) & route `/kpr` tetap ada di kode** (hanya di-comment-out di `App.jsx`).
  - `PropertyDetailPage`: section **Simulasi KPR** (dan disclaimer KPR di properti sewa) dihapus — properti Dijual tidak lagi menampilkan simulator; `// import KprSimulator`.
  - `PropertyGridCard` & `ExploreInsights` (`CarouselPropertyCard`): **estimasi cicilan KPR** di-comment-out.
  - `ComparePage`: baris "estimasi cicilan" kini menampilkan `'-'` (KPR dihapus, `estimateMonthlyInstallment` di-unimport).
  - `ExplorePage`: item "Simulasi KPR" dihapus dari **FAB menu**; CTA section finansial kini `open-financial-profile` (bukan navigate `/kpr`).
  - `MoreCategoriesDrawer`: shortcut "Kalkulator KPR" dihapus (icon `Calculator` di-unimport).
  - `ExplorePage` QUICK_MENU, `HamburgerMenu`, `Footer`: link/menu KPR dihapus seluruhnya.
- **NIB (`Nomor Induk Berusaha`) untuk agen** (`91bd3cc`, migration `20260826_add_nib_to_agents.sql`):
  - Kolom `nib` baru di **`agent_applications`** & **`agent_profiles`** (default `''`).
  - `AgentApplicationPage`: field **NIB wajib** (Zod validasi required + digit saja) → payload insert `nib`.
  - Trigger `handle_agent_approval()` di-update untuk **menyalin `nib`** ke `agent_profiles` saat disetujui (INSERT & `on conflict ... update`).
  - i18n: `agentApply.nib`, `nib_placeholder`, `error_nib`, `error_nib_invalid`.
- **Validasi WhatsApp listing cocok dengan profil** (`91bd3cc`, di `SellPropertyPage` sebelum submit): nomor WhatsApp form harus **sama persis** dengan nomor terdaftar di profil akun (baca `profiles.whatsapp` / `user.user_metadata.whatsapp`); normalisasi `08`/`62`/`+62` → prefix `62` sebelum dibandingkan; mismatch → toast error + blokir submit.
- **Sinkronisasi role real-time saat admin ubah role user** (`f839930`):
  - **Akar masalah**: `AuthContext.fetchRole()` hanya berjalan saat login/auth change; admin mengganti role di DB tidak memicu event auth → role user stale sampai keluar-masuk.
  - **Fix**: `AuthContext` kini subscribe **Supabase Realtime** pada tabel `profiles` (filter `id=eq.<user.id>`, event UPDATE) → `setRole(payload.new.role)` seketika saat admin mengubah role.
  - `ProfileDrawer`: role diambil dari `useAuth()` (single source of truth) — hapus fetch role mandiri yang menyebabkan inkonsistensi.
- **Tuning prompt HuniBot** (`3152004`): sistem prompt jadi lebih ringkas — "Jawab SANGAT ringkas: maksimal 2-3 kalimat pendek, langsung ke inti tanpa basa-basi", gunakan poin/bullet, hindari pembukaan "Tentu/Baik/Silakan", tolak di luar topik cukup 1 kalimat. Diterapkan konsisten di 3 tempat: `HuniBot.jsx` (frontend), `api/groq.js` (serverless), `vite.config.js` (dev proxy). Prompt translation/investment/search tidak diubah.

## Changelog — SEO, MoreCategoriesDrawer, Profil Penjual Publik (25 Agustus 2026)
- **SEO (`index.html` + `public/robots.txt`)**: tambah `<meta name="robots" content="index, follow">`, `<link rel="canonical">`, Open Graph tags (`og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:image`), Twitter Card (`summary_large_image`). `robots.txt` allow all dengan sitemap reference.
- **MoreCategoriesDrawer redesign (gaya Gojek)**: section "Layanan cepat" di atas (6 shortcut — Iklankan Properti, Cari Agen, Kalkulator KPR, Turun Harga, Tren Harga, Tanya Forum) dengan sticky glassmorphism header (`backdrop-blur`). **Mode grid/list toggle** — default grid, tombol `LayoutGrid`/`List` di header sticky. **Deskripsi per kategori** (contoh: "Temukan hunian tapak idamanmu"). Micro-interactions premium (hover scale, active scale, smooth transitions). Kategori Disewa bertambah: Hotel, Kost, Villa (badge `isNew`). Swipe-to-close via `useDragControls`.
- **Halaman profil penjual publik `/seller/:id`** (`SellerProfilePage.jsx`, 806 baris): profil publik siapa pun berdasarkan `seller_id`. Statistik (total iklan, rating, review, listing aktif). Daftar properti (verified + sold) dengan tab Dijual/Disewa. Ulasan pembeli (agent saja). Forum posts (3 terbaru). Sticky action bar di mobile (Chat/WhatsApp/Bagikan). Badge "Profil Anda" untuk user yang login = pemilik profil. Integrasi **personalisasi berbasis profil keuangan** — `PropertyGridCard` menampilkan badge "Cocok dengan Budget" jika cicilan properti ≤ anggaran pembeli + link "Profil Finansial" jika belum mengisi.
- **`PropertyGridCard.jsx`** (reusable): kartu properti untuk grid listing. Badge cerdas (VERIFIED/PREMIUM/Turun Harga), estimasi cicilan/rent per month, quick actions (Save/Compare/Share) di footer kartu. Dipakai di ExplorePage & SellerProfilePage. Integrasi `useCompare` hook + `estimateMonthlyRent` untuk properti sewa.
- **`useCompare.js`** (refactor): hook baru untuk compare — `compareSet`, `toggleCompare`, `isInCompare`, `clearCompare`. Event `compare-updated` untuk sinkronisasi antar komponen.
- **Filter author di forum** (`ForumPage`): query `?author=USER_ID` untuk melihat semua post dari user tertentu. Tombol "Lihat semua postingan" di ForumDetailPage (post author) dan SellerProfilePage.
- **Bug fixes**: normalisasi harga sewa per bulan (`d1682ad`), fix crash tren harga `map.get.push` (`d1682ad`), fix query `agent_profiles` pakai `user_id` bukan `id` (`08167f7`), konsisten label inspeksi/survei di ScheduleVisit (`fb7b6dc`).

## Changelog — Footer Revamp & Newsletter Fungsional (12 Agustus 2026)
Fokus: membereskan data dummy, menghidupkan fitur berlangganan, dan menambah halaman legal. Semua dikerjakan di `src/components/Footer.jsx`, `src/components/LegalPage.jsx`, dan `src/App.jsx`.
- **Email resmi di footer**: `officialhunione@gmail.com` menggantikan `halo@hunione.com`. Kartu email di-redesign — teks email dijamin **satu baris lurus** (`whitespace-nowrap`, `text-xs sm:text-sm`, `w-full`), kolom KONTAK diperlebar (grid footer diubah dari `lg:grid-cols-5` → `lg:grid-cols-12`: logo `col-span-3`, nav `col-span-2`, kontak `col-span-3`).
- **Section statistik dihapus**: 3 kotak (Properti Terverifikasi / Pengguna Terdaftar / Diskusi Forum) **beserta seluruh state, useEffect, dan query Supabase** (`fetchStats`) yang menghitungnya — halaman utama tidak lagi terbebani fetch yang tidak ditampilkan.
- **Tombol App Store & Google Play dihapus** dari baris trust badges (layout menjadi centered/flex-wrap).
- **Newsletter fungsional** (`handleSubscribe` async):
  - Insert ke tabel **`newsletter_subscribers`** (`supabase.from('newsletter_subscribers').insert([{ email }])`).
  - Validasi email kosong/format → toast `footer.newsletter_required` (warning).
  - Sukses → toast "Terima kasih telah berlangganan!", input dikosongkan, form berubah jadi pesan sukses.
  - **Deteksi email duplikat**: error Supabase `code === '23505'` → toast khusus "Email ini sudah terdaftar sebelumnya!" (bukan pesan error generik).
  - Error lain → toast `footer.newsletter_error`.
  - `isLoading` state: tombol berubah "Mengirim..." + spinner + `disabled` (anti double-submit).
- **Persistensi localStorage**: key `hunione_newsletter_subscribed` — state `subscribed` di-inisialisasi lazy dari localStorage (form tidak muncul lagi saat reload; sesuai lint `react-hooks/set-state-in-effect`).
- **Data dummy dibereskan**: tombol WhatsApp dihapus (nomor `6281234567890` dummy tidak dipakai lagi), link sosial LinkedIn & Facebook (`href="#"`) dihapus — tersisa Instagram & TikTok yang URL-nya aktif.
- **Legal links di bottom bar footer**: "Syarat & Ketentuan" → `/terms`, "Kebijakan Privasi" → `/privacy`.
- **Halaman legal baru** (`src/components/LegalPage.jsx`): konten statis elegan + lokalized (EN/ID, namespace `legal`), **eager import di `App.jsx`** (bukan `React.lazy`) agar tidak pernah stuck di loading spinner / blank saat chunk gagal termuat.
  - UI: **hero card** gradient navy + badge last-updated + intro, **sticky Table of Contents** sidebar (desktop) / chips horizontal (mobile) dengan **active-section highlight** via `IntersectionObserver`, **scroll progress bar** di atas halaman, kartu section bernomor + ikon, **contact CTA** (tombol Email Us + tombol **copy email** ke clipboard dengan toast), **cross-link** Terms ↔ Privacy, tombol **back-to-top** floating (muncul setelah scroll > 20%).

## Changelog — Redesign ExplorePage (Fase 1 & 2)
Misi: **"Less Click. More Discovery. More Trust. More Conversion."** — meningkatkan retention, engagement, lead, conversion, session time, dan returning user. Mobile-first, tanpa mengubah branding/warna.
- **Fase 1 (struktur & discovery)**:
  - `src/components/ExploreInsights.jsx` (baru): section **Market Pulse** (rata-rata harga per kota dengan pill naik/stabil/turun vs acuan), **collection carousel** "Baru Turun Harga", "Rumah Pertama" (≤1,5M), "Rumah Premium", dan **trust bar** (Properti/Kota/100% Terverifikasi). Semua menampilkan `null` bila data tak memadai.
  - **Hero activity card**: statistik hidup (properti baru hari ini, harga turun, agen siap bantu, diskusi aktif) berbasis `properties` + count `agent_profiles`/`forum_posts`, tiap sel klik ke listing/`/price-drop`/`/agents`/`/forum`.
  - **Section "Untuk Anda"** (personalized): ranking dari kota favorit (dari `getFavorites`) + budget KPR (`getFinancialProfile` → `maxAffordablePrice`, asumsi 5.5%/15th/DP20%), dengan chip sinyal ("Kota favoritmu", "Cocok dengan budget"). Menggantikan rekomendasi statis.
  - **Sticky search bar** (fixed `top-14`, muncul saat scroll >520px) dengan fake-search + akses cepat Analisis Harga / Harga Turun.
  - **Quick access** diberi judul "Layanan cepat".
  - **Realtime footer strip** (properti tersedia, agen, "harga selalu diperbarui") di atas listing.
  - **Compare prompt**: kartu ajakan bandingkan saat `compareList` kosong, CTA "Pilih 3 teratas" → toggle 3 properti pertama.
  - **Onboarding empty state** diperkaya (link ke forum).
  - Badge `explore.property_card.price_drop` di id & en.
- **Fase 2 (komunitas & personalisasi)**:
  - `src/components/ExplorePhase2.jsx` (baru): **Agen Terpercaya** (top 6 `agent_profiles.is_visible` merge `agent_stats`, urut skor terjual+rating), **Diskusi Trending** (4 post `forum_posts` pinned-first, badge kategori/Hot, author+`timeAgo`, balasan & views), **Pilihan Investasi** (ranking harga/m² + indikator "potensi sewa" untuk apartemen; reuse `CarouselPropertyCard` yang kini di-export).
  - **Saved search reminder**: strip Bell via `useSavedSearchAlerts()` → `/saved-searches` saat ada properti baru yang cocok.
  - **Floating CTA expandable**: tombol `+` bawah-kanan, memutar 45°, membuka Jual Properti / Simulasi KPR / Tanya Forum; otomatis sembunyi saat CompareBar aktif.
  - **Property card upgrade (bagian 1)**: tombol `Share2` di kartu listing (native share, fallback salin link + toast).
  - **Dilewati sengaja**: nearby geolocation (tidak ada kolom lat/lng di `properties`), AI Score (butuh panggilan AI per kartu, risiko 429).
- **Fase 3 (upgrade kartu properti grid)** — 20 poin arah desain Aqsha tuntas & adaptasi selesai:
  - **Badge cerdas (tanpa tumpukan kasar)**: maks 2 chip di kiri-atas — **VERIFIED** (chip putih transparan + `BadgeCheck`, selalu) & **PREMIUM** (emas + `Star`, bila `is_premium`); **Turun Harga** (merah + `TrendingDown`) satu-satunya di kiri-bawah. Deteksi drop via `original_price > price`. Chip `seller_type` & `typeLabel` lama dihapus agar bersih.
  - **Estimasi cicilan**: baris kecil di bawah harga — `Estimasi cicilan Rp X/bulan` via `estimateMonthlyInstallment(price, 5.5% , tenor 20, DP 20%)`; disembunyikan untuk properti sewa (Dijual).
  - **Quick actions dalam kartu**: restrukturisasi kartu menjadi container `div` (gambar + isi dibungkus `<Link>`, action bar terpisah di kaki kartu) — menghindari nested-anchor yang tidak valid. Tombol **Save** (Heart+label), **Bandingkan**, **Share** akses langsung tanpa buka halaman detail.
  - **Rating Area & AI Score di-skip permanen** agar kartu ringan saat dirender massal.


## Changelog — Perbaikan Favicon & Sinkronisasi Auth (satu batch)
- **Favicon untuk Google Search**: `index.html` sebelumnya mendeklarasikan `type="image/svg+xml"` untuk file JPEG → MIME mismatch membuat Google/tab menampilkan ikon globe default. Diganti menjadi `<link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.
  - Aset baru di `public/`: `favicon.png` (512×512 PNG, persegi 1:1 — memenuhi aturan Google) & `apple-touch-icon.png` (180×180 PNG untuk Home Screen iOS), digenerate dari logo persegi `favicon_hunione.jpeg` (1600×1600).
  - Catatan: `huniOne.svg` ber-viewBox 1920×1080 (landscape/banner), tidak layak jadi favicon; logo persegi sudah tersedia sebagai JPEG.
- **Handling error rate-limit (429) Supabase Auth** — tanpa menambah rate-limit backend baru (tetap mengandalkan default Supabase Auth untuk brute-force):
  - `src/utils/authErrors.js` (baru): helper `isRateLimitError(error)` — deteksi via `status === 429`, `statusCode`, `code` (pattern `rate`/`over_request`), atau pola pesan (`rate limit`, `too many requests`, `too many attempts`).
  - `MinimalistLogin.jsx`: login (`signInWithPassword`) & registrasi (`signUp`) kini lewat `handleAuthError()` → saat 429 tampilkan Toast + inline error ramah `login.too_many_attempts`, bukan pesan mentah Supabase.
  - `ProfileDrawer.jsx`: semua panggilan `signInWithPassword` (verifikasi ganti email), `updateUser` (ganti email & ganti password) kini konsisten memakai `isRateLimitError` → Toast ramah `login.too_many_attempts` saat 429.
  - Translasi: key `login.too_many_attempts` ditambahkan di `src/locales/id/translation.json` & `en/translation.json` — "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi."
- **Bug pesan 429 salah tujuan**: `vite.config.js` — branch limit untuk `investment` & `fair_price` sebelumnya selalu menampilkan "Batas analisis harga tercapai". Kini *purpose-aware*: investasi → "Batas analisis investasi tercapai", fair price → "Batas analisis harga tercapai".

## Changelog — Sewa 360°, Chat Read Receipt, Survey Seller, Lapor Iklan (7 Agustus 2026)
- **Dukungan properti sewa penuh (end-to-end)**:
  - **Periode harga** (`properties.price_period` = `'total'`|`'bulan'`|`'tahun'`, migration `20260822_property_price_period.sql`): harga Dijual = total, Disewa = per bulan/tahun. Backfill listing Disewa lama → `'bulan'`.
  - **Form iklan** (`SellPropertyPage`): field baru **luas tanah** (`land_area_sqm`, `area_sqm` tetap luas bangunan) & **kondisi furnished** (`furnished` = '' / furnished / semi_furnished / unfurnished) — migration `20260823_property_detail_fields.sql`; default `price_period='tahun'` untuk sewa; luas 0 ditampilkan sebagai `-`; foto draft tidak valid disaring; validasi inline + indikator draft.
  - **Penyaringan fitur kepemilikan**: properti sewa **tidak** menampilkan Simulasi KPR (diganti **Simulasi Sewa**), analisis investasi (`InvestmentAnalyzer`) & harga wajar (`FairPriceAnalyzer`) **disembunyikan**; label harga ditambah `/bulan`; kartu properti & detail menampilkan **badge keterjangkauan** sewa di Explore/Compare/detail.
  - **Tren & harga turun**: `PriceTrendPage` & `PriceDropPage` dinormalisasi ke harga sewa **per bulan** (fix crash `map.get.push`); sort harga sewa dinormalisasi; filter **Disewa** punya **rentang harga bulanan** (price bands /bulan).
  - **Compare**: **diblokir membandingkan sewa vs properti jual** (campuran kategori ditolak).
  - **Jadwal survei**: label konsisten **Inspeksi/Survei** di `ScheduleVisit` untuk properti sewa.
- **Chat realtime diperbesar** (`ChatHubPage` + `TopNavbar`):
  - **Read receipt & unread persisten** via `direct_messages.read_at` (migration `20260821_chat_read_receipts.sql`, realtime UPDATE) — pengirim melihat pesan sudah dibaca.
  - **Badge unread di top navbar** (selain item Chat di drawer) + i18n; perhitungan unread konsisten via `read_at`.
  - **Typing indicator**, **paginasi** (load older), **date separator**, **header & bubble UI**, dan **kartu konteks properti** (chat menampilkan konteks properti yang dibicarakan).
- **Alur jadwal survei di sisi seller** (`MyListingsPage`, migration `20260820_seller_survey_visits.sql`): seller kini bisa **konfirmasi / tolak / selesaikan** jadwal survei (sebelumnya hanya buyer bisa cancel), realtime agar seller dapat notif instan; RLS UPDATE baru untuk seller & admin (buyer tetap boleh cancel → `'cancelled'`).
- **Lapor iklan** (`ReportListingModal` + `AdminPropertyReports`, migration `20260819_property_reports.sql`): pembeli (login) melaporkan listing dengan alasan (penipuan/harga/terjual/duplikat/lokasi/lainnya) → tabel `property_reports` → antrian admin: **Hapus Listing** (delete permanen + hapus foto storage) atau **Tutup Laporan** (tidak terbukti); audit action baru `delete_property` & `dismiss_report`.
- **Definisi "properti baru"** (`properties.published_at`, migration `20260820_property_published_at.sql`): diisi otomatis saat status → `'verified'` (backfill `created_at`); dipakai untuk section "Baru" / collection **tidak lagi mengandalkan `created_at` draft**.
- **Section Kepercayaan live data** (`dc8dfb2`): data/UI/UX live (bukan angka statis) di footer/explore trust bar.
- **Perbaikan ExplorePage**: `CarouselPropertyCard` **diseragamkan dengan kartu grid Fase 3** (badge cerdas + quick action yang sama), **dedup properti antar-section** agar tidak tampil berulang, **Market Pulse UI/UX** diperhalus (badge naik/stabil/turun, detail foto listing), **FAB aksi cepat dipindah** agar tidak tertutup HuniBot, `pb-32` bawah halaman, scroll ke pencarian `block:nearest` + fokus langsung, perbaikan UI mobile.
- **Language switcher di TopNavbar** (selain di drawer).
- **Autocomplete Kota** (`LocationAutocomplete.jsx`) di form iklan properti **& form wilayah agen** (data `wilayah.js`).
- **Fix statistik agen**: query count `agent_profiles` memakai `user_id` (kolom `id` tidak ada) → statistik agen (view `agent_stats`) kembali terisi.

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
| `/` atau `/explore` | ExplorePage | Tidak | filter by status='verified', back-to-top button, lazy loading images, **Cari Properti** scroll & fokus ke kotak pencarian, quick menu "Cari Agen" → `/agent-apply`, **pencarian populer & tombol Acak → filter nyata via `?q=`** (bukan dead-end), empty state "Belum ada properti" saat kosong |
| `/login` | MinimalistLogin | Tidak | |
| `/sell-role` | RoleSelectionPage | Ya | onboarding pilih peran sebelum iklan properti |
| `/agent-apply` | AgentApplicationPage | **Ya (login)** | form pendaftaran agen → insert `agent_applications` dengan `user_id` (20260802 — tidak lagi publik) |
| `/agents` | AgentsPage | Tidak | direktori agen publik (Top Agent, search, filter region, sort); **tombol Chat → `/chat?user=ID`** |
| `/agents/:id` | AgentDetailPage | Tidak | profil agen + listing + ulasan pembeli |
| `/agent-profile` | AgentProfilePage | Ya (agen) | kelola profil direktori agen sendiri (toggle `is_visible`, bio, dll) |
| `/sell` | SellPropertyPage (3-step) | Ya | + edit via `?edit=ID`, beforeunload guard, draft autosave |
| `/my-listings` | MyListingsPage | Ya | Edit & **Tandai Terjual** (verified→sold), status timeline **vertikal di mobile** (tidak terpotong), card sold diredupkan + catatan "Iklan telah ditandai terjual", **tab Leads** (`whatsapp_leads` per listing) |
| `/seller/:id` | SellerProfilePage | Tidak | profil penjual publik — statistik, listing, ulasan, forum posts, sticky action bar mobile, personalisasi budget |
| `/chat` | ChatHubPage (realtime DM) | Tidak (login prompt) | ArrowLeft lucide icon |
| `/forum` | ForumPage | Tidak | hero stats, category pills, sort tabs, search + filter tag via `?tag=` + **filter author via `?author=`** |
| `/forum/:id` | ForumDetailPage | Tidak | views counter, reactions, poll, best answer, related threads, share |
| `/property/:id` | PropertyDetailPage | Tidak | **mobile bottom price bar (sticky)**, **spec tiles** (KT/KM/luas/sertifikat), **map card**, harga di sidebar desktop, Properti Serupa, KPR simulator, lightbox gallery, **share → toast sukses/gagal**, **alamat area-only + gate alamat lengkap via kontak agent** |
| `/admin` | AdminDashboardPage | Ya (admin only) | **6-tab** (Overview/**Agen**/**Harga**/**Laporan**/Users/Audit Trail), preview modal, konfirmasi sebelum verify/survei/bulk + **undo**, soft reject, pagination, realtime, filter **Terjual** |
| `/kpr` | KprCalculatorPage | Tidak | **HIDDEN (26 Aug 2026)** — route & component masih ada di kode tapi di-comment-out sementara dari `App.jsx`; mesin `KprSimulator.jsx` tetap tersedia |
| `/compare` | ComparePage | Tidak | bandingkan max 3 properti + affordability dari financial profile |
| `/saved-searches` | SavedSearchesPage | Ya | kelola alert pencarian tersimpan (`saved_searches`) |
| `/terms` | LegalPage (type='terms') | Tidak | Syarat & Ketentuan (eager import, UI hero + sticky TOC + progress bar) |
| `/privacy` | LegalPage (type='privacy') | Tidak | Kebijakan Privasi (eager import) |
| `*` | NotFoundPage | Tidak | wildcard route, bukan redirect |
| `/coming-soon` | ComingSoonPage | Tidak | |

## Fitur Utama

### 1. SellPropertyPage (3-Step Flow)
- **Step 0 — Info Properti**: kategori (Dijual/Disewa), tipe properti, judul, **harga + `price_period`** (total untuk Dijual; per **bulan/tahun** untuk Disewa), **luas bangunan & luas tanah** (`area_sqm`/`land_area_sqm`), **kondisi isi** (`furnished`), KT/KM/sertifikat, deskripsi + tombol **Saran AI** via Groq API (`model: llama-3.3-70b-versatile`, parse `choices[0].message.content`), alamat, kota, kecamatan (input pakai **autocomplete** `LocationAutocomplete`)
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
- **Pencarian populer** (chip "rumah bandung", "apartemen jakarta", dll): mengisi query lalu menavigasi ke `/explore?q=...` — filter nyata (bukan dead-end)
- **Tombol Acak (Shuffle)**: benar-benar mengacak urutan daftar properti
- **Empty state**: saat tidak ada properti verified, tampil "Belum ada properti" + CTA jual (fallback `DUMMY_PROPERTIES` dihapus)
- **RecentlyViewed** (`<RecentlyViewed />`): kartu horizontal properti yang terakhir dilihat
- **CompareBar** (`<CompareBar />`): floating bar bottom saat ada item di keranjang banding

### 3. PropertyDetailPage
- **Gallery**: Desktop (Airbnb-style grid) / Mobile (hero + thumb grid) + Lightbox (fullscreen, keyboard nav)
- **Agent Card**: sticky sidebar (desktop), floating WhatsApp bar (mobile, IntersectionObserver — deps `[loading]` fixed)
- **KprSimulator**: mortgage calculator
- **Properti sewa (202608)**: properti Disewa menampilkan **Simulasi Sewa** (bukan KPR), harga berlabel `/bulan`, analisis investasi & harga wajar disembunyikan, harga + affordability badge per periode
- **Properti Serupa**: grid 6 item, filter by category/city, exclude current ID, limit 6, status='verified'
- **Accordion**: Panduan Membeli + Disclaimer
- **UI/UX detail (b1dda98)**: **mobile bottom price bar** (sticky di bawah layar), **spec tiles** (KT/KM/luas/sertifikat), **map card**, harga terpajang di **sidebar desktop**
- **Share**: tombol bagikan → toast sukses/gagal (diambil dari `useAuth`)
- **Privasi lokasi (da8f6ca)**: alamat tampil **area-level saja** (kota/kecamatan); alamat lengkap di-gate di belakang kontak agent → dibuka via WhatsApp
- **Jadwal Survei (3428e59)**: form simpan ke `site_visits` + buka WhatsApp pre-filled tanggal/jam + tombol "Lanjut ke WhatsApp" (hybrid — bukan cuma buka WA)
- **WhatsApp Leads (20260816)**: klik "Hubungi via WhatsApp" → catat ke tabel `whatsapp_leads` (property+seller+buyer)
- Dynamic EN translation via `useGroqTranslation` hook
- Lazy loading images

### 4. KPR Calculator
- **KprSimulator.jsx** (reusable): annuity formula, DP slider 0-50% — **mesin tetap ada di kode, tapi sementara disembunyikan dari UI (26 Aug 2026)**; route `/kpr` di-comment-out di `App.jsx`
- **KprCalculatorPage.jsx** (full page): 2-column, DP 0-80%, amortization table (yearly), biaya tambahan (BPHTB 5%, PPN 11%, Notaris 1%, Provisi 1%), WhatsApp integration
- **Enhancements (Aug 2026)**: ringkasan finansial (DP, pokok, total bunga, total bayar), **minimum income** (cicilan / 0.3), **CountUp** animasi angka (`CountUp.jsx` via rAF easeOutCubic), **DP presets** (10/20/30/50%) + **tenor presets** (10/15/20/25 th), slider DP diperbaiki, tombol **HuniBot** (custom event `open-hunibot-question` dengan konteks harga/DP/bunga/tenor), tombol **WhatsApp** share, integrasi `financialProfile` (batas ideal dari `maxInstallment`, progress bar, saran naik DP/perpanjang tenor saat cicilan melebihi batas), i18n
- **Input limits (Aug 2026)**: harga properti di-cap **Rp100 miliar** + warning bila < Rp10 juta, suku bunga di-cap **30%/thn** (warning), DP warning bila < 10% atau nominal > harga — diterapkan di `KprSimulator.jsx` & `KprCalculatorPage.jsx` (konstanta `PRICE_MIN`/`PRICE_MAX`/`INTEREST_MAX`/`DP_MIN_PCT`)

### 5. HuniBot (AI Chatbot)
- Floating chat widget via Groq API
- Personalized greeting, contextual KPR, route-aware hiding
- Animated bubbles via framer-motion
- Purpose-based system prompt: `chat` (ID) vs `translation` (EN, JSON-only)

### 6. ChatHubPage (Realtime DM)
- Two-column: contact list + chat window
- Mobile toggle, realtime subscription via Supabase Realtime
- **Read receipt (20260821)**: kolom `direct_messages.read_at` — receiver menandai dibaca (policy UPDATE), pengirim lihat status "Dibaca" live via realtime UPDATE
- **Badge unread di top navbar** (`TopNavbar`) + badge di item Chat drawer (perhitungan konsisten via `read_at`)
- **Typing indicator**, **paginasi** (load older messages), **date separator**, header & bubble UI yang diperhalus, **kartu konteks properti** dalam chat
- ArrowLeft icon dari lucide-react (bukan custom SVG)

### 7. Admin Dashboard
- **5-tab**: Overview (analytics + pending table), **Agen** (review pendaftaran agent eksternal), **Harga** (antrian perubahan harga — AdminPriceChangeQueue), Users (role management via dropdown), Audit Trail (log)
- **Tab Laporan** (`AdminPropertyReports`, 20260819): antrian laporan iklan (`property_reports`) — admin bisa **Hapus Listing** (delete permanen + hapus foto di storage) atau **Tutup Laporan** (tidak terbukti); semuanya dicatat di `audit_logs`
- **AdminDashboardPage enhancements**: preview modal (gallery, inline property info), reject modal (required reason → `audit_logs`), soft delete (status='rejected' + restore button), **konfirmasi modal sebelum Setujui/Survei/Bulk verify** + **tombol Undo di toast** (mengembalikan status ke kondisi sebelumnya), filter tabs (Semua/Pending/Survei/Terverifikasi/**Terjual**/Ditolak), status `'sold'` dikenali (label **"Terjual"**, badge abu-abu, aksi **"Aktifkan Lagi"** → pending), bulk verify (checkboxes), pagination (10/page), thumbnails di table, search input, realtime subscription (INSERT/UPDATE on properties)
- **AdminAgentApplications**: daftar pendaftaran calon agen (`agent_applications`) dengan filter Pending/Disetujui/Ditolak/Semua, tombol **Setujui** (→ status approved + trigger update role profil ke 'agent' + isi `agent_profiles`) dan **Tolak** (wajib alasan → `reject_reason`, ConfirmModal + textarea), catat `audit_logs` (`approve_agent`/`reject_agent`, target_type `agent_application`); admin bisa **hapus** aplikasi menggantung (20260808)
- **AdminPriceChangeQueue**: antrian perubahan harga di luar ambang 15% — admin bisa **setujui/tolak** (`approve_price_change`/`reject_price_change`), properti yang ditahan tetap menampilkan harga lama dengan status `price_change_status='pending'`
- **ConfirmModal**: props `danger`, `icon`, `children`, `confirmDisabled`
- **AdminAnalyticsCards**: 4 metric cards (verified/pending/totalUsers/agentCount) — hanya status exact, tidak terpengaruh status baru
- **AdminAuditLog**: 100 recent entries
- **Toast mendukung `action`** (mis. tombol **Undo**): `showToast(msg, type, { label, onClick })` — timeout 6s saat ada action (dari `AuthContext`)

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
  - **Views counter**: RPC `increment_forum_views(post_id)` (security definer) sekali per buka (guard `viewedRef`) — bukan `.update({ views })` langsung (20260810, karena RLS)
  - **Reactions multi-emoji** (👍❤️🔥💡) di post & reply via tabel `forum_reactions` (unique user+target), toggle / ganti emoji, realtime `*` event
  - **Poll render**: bar persentase, vote sekali per user (`forum_poll_votes` upsert on conflict `post_id,user_id`), badge "suara Anda"
  - **Best answer**: OP bisa tandai balasan sebagai solusi (`solved_reply_id`) — balasan dapat border emerald + badge "Jawaban Terbaik"
  - **AI Summarize**: *(DIHAPUS — 20260804, boros token)* — fitur "Ringkas" untuk merangkum thread dihapus dari ForumDetailPage
  - **Related threads**: 3 post se-kategori (exclude current), klik → navigasi
  - **Share** via WhatsApp, **quote reply**, **edit post/reply inline**, realtime INSERT `forum_replies` + `forum_reactions`, auto-scroll, success toast, cancel confirm
- **Markdown.jsx** + **utils/markdown.js**: parser markdown ringan tanpa library (blocks: h1-h3, quote, ul/ol, paragraph; inline: bold/italic/code/link/`#tag`; `isSafeUrl` hanya izinkan http(s) & path relatif)

### 9. Compare Properti
- **utils/compare.js**: localStorage key `vastara_compare`, **MAX_ITEMS = 3**, `getCompareList/addToCompare/removeFromCompare/isInCompare/clearCompare`, event `compare-updated`
- **CompareBar** (bottom fixed bar): muncul saat ada item, thumbnail + title + remove per item, counter `n/3`, tombol "Bandingkan" → `/compare`
- **ComparePage** (`/compare`):
  - Table perbandingan (gambar, harga + badge **Termurah**, cicilan KPR estimasi, tipe, KT/KM, luas, kota, alamat, sertifikat)
  - **Upgrade (202608)**: tambah **harga/m²**, tombol **share** (bagikan hasil banding), **rekomendasi**, **sticky kolom** (kolom properti tetap terlihat saat scroll), **mini bar**; perbaiki overflow CompareBar & prompt compare di mobile; **diblokir menggabungkan sewa vs properti jual** (kategori campuran ditolak)
  - **Personalization affordability**: baca `user_financial_profiles` → `computeAffordability` (take-home × 30% atau budget) → **buying power** (`maxAffordablePrice`) → badge **"Dalam Jangkauan"/"Di Atas Budget"** per properti, cicilan merah bila > `maxInstallment`, banner summary (buying power + cicilan maksimal)
  - **Empty financial profile**: banner CTA "Isi profil finansial" → dispatch `open-financial-profile` (auto-buka ProfileDrawer, auto-refresh via event `financial-profile-saved`)
  - Skeleton loading, request race-guard (`requestRef`), sync live via `compare-updated` + `storage` events

### 10. Recently Viewed
- **utils/recentlyViewed.js**: localStorage key `vastara_recently_viewed`, max 10, event `recently-viewed-changed`
- **RecentlyViewed** (di ExplorePage): kartu horizontal `w-40` dengan **hapus per-item** (X), **hapus semua** (Trash2), **scroll kiri/kanan** (desktop), **label waktu** "Dilihat {timeAgo}", **tombol compare** per kartu (toggle + toast max), live sync via `storage` + `recently-viewed-changed`, i18n
- `PropertyDetailPage` memanggil `addRecentlyViewed(property)` saat properti dimuat

### 11. Pendaftaran Agen
- **AgentApplicationPage** (`/agent-apply`, **wajib login — 20260802**): form full_name, email, whatsapp (wajib), **nib (`Nomor Induk Berusaha`, wajib — 20260826)**, agency, experience (<1/1-3/3-5/5+ tahun), region, portfolio, **checkbox persetujuan** (wajib), info review 3-langkah. Submit → insert `agent_applications` dengan `user_id` (RLS `user_id = auth.uid()`) + status default 'pending', tampil success state. `useSEO` title/description.
- **AdminAgentApplications** di dashboard admin tab **Agen**: list + filter + approve/reject/hapus (lihat bagian 7).
- Approval mengaktifkan **trigger** `handle_agent_approval()` yang otomatis update `profiles.role = 'agent'` untuk profil dengan `user_id` yang sama (fallback email), kecuali admin.

### 12. Favorites (Saved Properties)
- **Sync ke database**: table `saved_properties` (user_id, property_id, unique constraint)
- **utils/favorites.js**: `setSupabase(client)`, `async initFavorites(userId)` load from DB, `async toggleFavorite(id)` write localStorage + Supabase in background
- **AuthContext**: panggil `setSupabase()` on mount, `initFavorites()` on auth state change
- **Fix DB (20260818)**: trigger `set_saved_property_owner()` mengisi `user_id = auth.uid()` otomatis — klien (`favorites.js:49`) insert hanya `{ property_id }`, tanpa trigger insert selalu gagal (kolom NOT NULL + RLS). **Smoke test: favorit kini tersimpan di DB**.
- **SavedPropertiesList.jsx** (shared): daftar properti favorit reusable dengan skeleton (fallback `DUMMY_PROPERTIES` dihapus) — dipakai HamburgerMenu & ProfileDrawer. **Halaman `/saved` dihapus** (SavedPropertiesPage.jsx dibuang) — favorit diakses via drawer.

### 13. Navigasi (HamburgerMenu / SlideOver)
- **HamburgerMenu rewrite**: a11y (role/aria, keyboard), i18n penuh, pakai **SavedPropertiesList** shared (bukan fetch duplikat)
- **Logout confirm**: klik Logout → ConfirmModal (bukan langsung signOut)
- **Unread chat badge**: `useChatUnread(userId)` menghitung `direct_messages` (receiver = user, created_at > `huniOne_last_chat_read` di localStorage) + realtime INSERT → badge merah `n/99+` di item Chat
- **Language switcher inline**: panel pilih bahasa ID/EN di dalam drawer
- **Reduced motion**: `usePrefersReducedMotion()` (matchMedia `prefers-reduced-motion`) dipakai di SlideOver/HamburgerMenu
- **SlideOver.jsx**: reusable drawer base dengan a11y (Escape close, focus trap, `z-index` numerik, respect reduced motion)

### 14. Agent Directory (Direktori Agen Publik — Aug 2026)
- **AgentsPage** (`/agents`, publik): daftar agen terverifikasi dengan **Top Agent** badge (listing_score), search nama/agensi, filter region, sort (Top/Rating/Nama A-Z), stats per agen (listing, premium, rating, ulasan), tombol Chat & WhatsApp
- **AgentDetailPage** (`/agents/:id`): profil agen (bio, wilayah, agensi, portfolio), **Listing Properti** (hanya `status='verified'`, `seller_type='agent'`), **Ulasan Pembeli** (rating 1-5, satu ulasan per pembeli)
- **AgentProfilePage** (`/agent-profile`, butuh login agen): kelola profil direktori sendiri — toggle **tampil di direktori** (`is_visible`), bio, portfolio, dll. Data dari tabel `agent_profiles`
- Approval aplikasi agen (tab Agen di admin) otomatis: role profil → `agent` + isi `agent_profiles` (trigger `handle_agent_approval`)
- Statistik performa via **view `agent_stats`** (listing verified, premium, visits, rating, review_count)

### 15. WhatsApp Leads
- **Tabel `whatsapp_leads` (20260816)**: `property_id`, `seller_id`, `buyer_id` (nullable — lead fire-and-forget), `created_at`
- **Sumber**: klik "Hubungi via WhatsApp" di `PropertyDetailPage` (`buyer_id: user?.id || null`)
- **Tampilan**: seller lihat di **Iklan Saya → tab Leads** (`MyListingsPage`), admin lihat di **AdminDashboardPage**
- **RLS (20260818)**: INSERT **wajib login** (`auth.uid() is not null` — cegah spam anonim); SELECT seller utk properti sendiri + admin

### 16. Saved Searches (Alert Pencarian)
- **Tabel `saved_searches` (20260817)**: `user_id`, `name`, `filters` (jsonb), `active`, `last_checked_at`
- **SavedSearchesPage** (`/saved-searches`): simpan kriteria pencarian, toggle aktif/pause, hapus; `SavedSearchAlertsContext` menghitung "properti baru sejak cek terakhir" vs `properties` verified
- RLS: owner-only (select/insert/update/delete)

### 17. Price Drop & Price Trends
- **Guard harga (20260816)**: trigger `guard_property_price_change()` — seller boleh ubah harga **≤ 15%** langsung jadi (tercatat `price_history`); perubahan **> 15%** ditahan → `price_requested` + `price_change_status='pending'` menunggu persetujuan admin (tab **Harga** di admin)
- **`properties.original_price`** = harga tertinggi tercatat (baseline % penurunan), backfilled saat migrasi
- **UI tren & penurunan harga DIHAPUS (28 Aug 2026)**: `PriceDropPage` (`/price-drop`) & `PriceTrendPage` (`/price-trends`) dihapus, berikut section "Market Pulse"/"Baru Turun Harga" di landing, shortcut quick-service & search bar, serta link di `MoreCategoriesDrawer`/`ProfileDrawer`. Bagian **backend tetap dipertahankan**: guard harga, `original_price`, `price_history`, dan tab "Harga" admin masih aktif. Badge "Turun Harga" (`original_price > price`) per-kartu properti tetap tampil.

## Database Supabase

### Table `properties`
- `id` (uuid PK), `seller_id` (FK → profiles), `category`, `title`, `property_type`, `price` (bigint)
- `description_id`, `description_en` (text)
- `address`, `city`, `district`, `certificate_status`
- `bedrooms`, `bathrooms`, `area_sqm` (bukan `sqm`)
- `image_url` (text — single URL or JSON.stringify([...]))
- `seller_whatsapp`, `status` ('pending'/'in_review'/'verified'/'rejected'/'sold'), `created_at`
- **Kolom harga (20260816)**: `original_price` (numeric, baseline % penurunan), `price_requested` (harga yang ditahan), `price_change_status` ('none'/'pending'/'approved'/'rejected', default 'none'), `price_requested_at`, `price_reviewed_by`, `price_reviewed_at`
- **Kolom baru (Aug 2026, migrasi terbaru)**: `published_at` (timestamptz — 20260820, diisi otomatis saat status→'verified'), `price_period` (text 'total'/'bulan'/'tahun', default 'total' — 20260822), `land_area_sqm` (numeric — luas tanah; `area_sqm` tetap luas bangunan) & `furnished` ('' / furnished / semi_furnished / unfurnished, default '') — 20260823
- **TIDAK ada kolom** `agent_id`, `is_verified`, `gmaps_link` — mekanisme status murni via kolom `status`; penjual via `seller_id` (kolom `agent_id`/`owner_id` sudah di-drop 20260807).
- **Column naming**: `address` (bukan `location`), `area_sqm` (bukan `sqm`), `seller_whatsapp` (bukan `agent_whatsapp`), `description_id` (bukan `description`)

### Table `profiles`
 - `id` (uuid PK, references auth.users), `first_name`, `email`, `whatsapp`, `role`, `created_at`
 - **`whatsapp_verified` (bool, default false — 20260828)**: status verifikasi WhatsApp; wajib `true` untuk berinteraksi/pasang listing; di-set otomatis di trigger `handle_new_user()` & via RPC `set_whatsapp_verified(text)`
- **`is_super_admin` (bool, default false — 20260815)**: hanya super admin yang boleh mengubah role/`is_super_admin` (trigger `enforce_role_super_guard`); admin terakhir tidak bisa diturunkan (anti lockout)
- Role values: `pembeli`, `owner`, `agent`, `developer`, `admin` (constraint `profiles_role_check`)
- **TIDAK ada kolom `updated_at`** (sudah dibuktikan bugfix: update payload tidak boleh menyertakan `updated_at`).
- Catatan: **tidak ada tabel `agents` terpisah** — "agen" = baris `profiles` dengan `role` = agent/developer/admin.
- **Email/WhatsApp privat (20260808)**: `REVOKE select` dari `profiles`; publik hanya diberi `GRANT SELECT (id, first_name, role)` — kolom privat dibaca lewat RPC `get_my_profile()` (security definer, owner-only)
- **Role guard**: INSERT policy hanya `role='pembeli'`; trigger `profiles_role_change_trg` mencegah perubahan role oleh non-admin (pengganti subquery di policy — fix 42P17)
- **Auto-create**: trigger `handle_new_user()` membuat baris profil (role `pembeli`) otomatis saat user signup (20260810)

### Table `agent_profiles` (baru — direktori agen, 1:1 ke profiles)
- `user_id` (uuid PK, FK → profiles, cascade), `full_name`, `agency`, `region`, `experience`, `experience_years` (int), `portfolio`, `bio`, `whatsapp`, `nib` (text default '' — **20260826**), `is_visible` (bool, default true), `created_at`, `updated_at`
- RLS: select `is_visible = true` **atau user_id = auth.uid()** (agent bisa baca profil sendiri walau disembunyikan — 20260818); insert/update owner (`user_id = auth.uid()`, insert wajib role 'agent'); admin `for all` via subquery role admin

### Table `agent_reviews` (baru)
- `id` (uuid PK), `agent_id` (FK → profiles, cascade), `reviewer_id` (FK → profiles, cascade), `rating` (smallint 1-5), `comment`, `created_at`, `updated_at`, unique `(agent_id, reviewer_id)`
- RLS: select semua; insert/update/delete hanya reviewer sendiri

### View `agent_stats` (baru)
- Performa agen: `verified_listings`, `premium_listings`, `listing_score` (verified + premium), `total_visits`, `completed_visits`, `avg_rating`, `review_count` — join `profiles` + `agent_profiles` + `properties` (`seller_type='agent'`) + `site_visits` + `agent_reviews`
- `grant select` ke anon, authenticated

### Table `saved_properties`
- `id` (uuid PK), `user_id` (FK → profiles), `property_id` (FK → properties), `created_at`
- Unique constraint on `(user_id, property_id)`
- **Trigger `set_saved_property_owner()` (20260818)**: mengisi `user_id = auth.uid()` otomatis saat INSERT tanpa `user_id` (klien tidak mengirimnya)

### Table `audit_logs`
- `id`, `admin_id`, `admin_name`, `action_type`, `target_type`, `target_id`, `target_detail` (JSONB), `created_at`

### Table `direct_messages`
- `id`, `sender_id`, `receiver_id`, `content`, `created_at`
- **`read_at` (timestamptz, 20260821)**: read receipt — receiver menandai pesan dibaca (policy UPDATE `auth.uid() = receiver_id`); unread = pesan diterima tanpa `read_at`; realtime UPDATE di channel supabase

### Table `forum_posts`
- `id` (uuid PK), `author_id` (FK → profiles), `title`, `content`, `category` (text, default 'Umum'), `created_at`
- **Kolom tambahan (Aug 2026)**: `views` (int, default 0), `is_pinned` (bool, default false), `solved_reply_id` (uuid → forum_replies), `tags` (text[] default '{}'), `poll` (jsonb — `{ question, options[] }`)
- RLS (20260810): select semua, insert/update/delete author + admin; counter views lewat RPC `increment_forum_views()` (security definer)

### Table `forum_replies`
- `id` (uuid PK), `post_id` (FK → forum_posts), `author_id` (FK → profiles), `content` (support quoted reply format `<!--replyto:authorName|snippet-->`), `created_at`
- RLS (20260810): select semua, insert/update/delete author + admin
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
- `id` (uuid PK), `full_name`, `email`, `whatsapp` (not null), `nib` (text default '' — **20260826**, Nomor Induk Berusaha, wajib), `agency`, `experience`, `region`, `portfolio` (text, default '')
- `user_id` (uuid FK → auth.users — 20260802), `agreement_accepted_at` (timestamptz), `status` (check 'pending'/'approved'/'rejected', default 'pending'), `reject_reason` (text default ''), `reviewed_by` (FK → profiles), `reviewed_at`, `created_at`
- Index: `status`, `created_at`, `user_id`
- **RLS (20260802)**: insert `user_id = auth.uid()` (wajib login, bukan lagi "Anyone can submit"); select milik sendiri (`user_id = auth.uid()`); update hanya admin; **delete hanya admin** (20260808)
- **Trigger** `agent_approval_trigger` (after update status) → `handle_agent_approval()`: saat approved, update `profiles.role='agent'` untuk profil dengan `user_id` yang sama (fallback email, role lama pembeli/owner, bukan admin) + isi `agent_profiles`

### Table `site_visits`
- `id` (uuid PK), `property_id` (FK → properties), `buyer_id` (FK → profiles), `scheduled_date` (date), `scheduled_time` (time), `notes` (text, default ''), `status` (text, check: 'pending'/'confirmed'/'cancelled'/'completed'), `created_at`
- RLS: user hanya bisa select/insert milik sendiri (`auth.uid() = buyer_id`), dan update hanya ke status 'cancelled'.
- **Tambah (20260818)**: seller dapat select jadwal survei propertinya sendiri + admin dapat select semua (persiapan fitur jadwal survei di sisi seller)
- **Alur seller (20260820)**: seller/admin kini dapat **UPDATE** status jadwal (confirmed/cancelled/completed) via policy baru (`exists properties.seller_id = auth.uid()` / role admin); buyer tetap hanya bisa cancel → 'cancelled'; tabel masuk **realtime** `supabase_realtime` agar seller dapat notif instan

### Table `whatsapp_leads` (baru — 20260816)
- `id` (uuid PK), `property_id` (FK → properties, cascade), `seller_id` (FK → profiles), `buyer_id` (FK → profiles, nullable), `created_at`
- RLS: insert **wajib login** (20260818); select seller utk properti sendiri (`exists properties.seller_id = auth.uid()`) + admin
- Sumber data: klik "Hubungi via WhatsApp" di PropertyDetailPage; dibaca MyListingsPage (tab Leads) & AdminDashboardPage

### Table `newsletter_subscribers` (baru — 20260824)
- `id` (uuid PK, default `gen_random_uuid()`), `email` (text **NOT NULL UNIQUE**), `created_at` (timestamptz, default `now()`)
- RLS: **INSERT terbuka** (`with check (true)` — anon & authenticated boleh berlangganan); **SELECT/UPDATE/DELETE hanya admin** (`auth.uid() in (select id from profiles where role = 'admin')`) — daftar email pelanggan tidak bisa dibaca publik
- Sumber data: form newsletter di footer (`Footer.jsx` → `supabase.from('newsletter_subscribers').insert([{ email }])`); error unique violation (`code 23505`) ditangkap → toast "Email ini sudah terdaftar sebelumnya!"

### Table `property_reports` (baru — 20260819, Lapor Iklan)
- `id` (uuid PK), `property_id` (FK → properties, cascade), `reporter_id` (FK → profiles, cascade), `reason` (check: penipuan/harga/terjual/duplikat/lokasi/lainnya), `note`, `status` (check: 'pending'/'dismissed'/'actioned', default 'pending'), `reviewed_by` (FK → profiles), `reviewed_at`, `created_at`
- Unique `(property_id, reporter_id)` — satu laporan per pembeli per properti; index `(status, created_at desc)`
- RLS: pelapor lihat/membuat laporannya (login); admin lihat semua + update status + hapus; aksi admin: **Hapus Listing** (delete property + foto storage) / **Tutup Laporan**
- Audit action baru: `delete_property`, `dismiss_report`

### Table `price_history` (baru — 20260816)
- `id` (uuid PK), `property_id` (FK → properties, cascade), `old_price`, `new_price` (not null), `price_pct` (numeric), `source` ('seller' dalam ambang / 'admin' approve/override), `applied_by` (FK → profiles), `created_at`
- Diisi oleh trigger `guard_property_price_change()` via `log_price_change()` (security definer); RLS enabled

### Table `saved_searches` (baru — 20260817)
- `id` (uuid PK), `user_id` (FK → profiles, cascade), `name` (default 'Pencarian saya'), `filters` (jsonb default '{}'), `active` (bool default true), `last_checked_at`, `created_at`
- RLS: owner-only (select/insert/update/delete `auth.uid() = user_id`)

### Table `user_financial_profiles`
- `id` (uuid PK), `user_id` (uuid, FK → **auth.users**, unique), `monthly_income`, `monthly_commitments`, `monthly_budget` (numeric), `purchase_goal` (check: 'rumah_pertama'/'huni'/'investasi'/'sewa'/'belum_tahu'), `created_at`, `updated_at`
- RLS: hanya pemilik.

### Table `property_ai_analysis`
- `id` (uuid PK), `property_id` (uuid, unique FK → properties, on delete cascade), `analysis_data` (jsonb), `created_at`
- RLS: select semua (cache publik); **tulis hanya via RPC `set_property_ai_analysis()`** (security definer, hanya service_role) — 20260808
- Dipakai oleh InvestmentAnalyzer untuk cache hasil analisis AI per properti (30 hari + fingerprint preferensi investor).

### Storage `PROPERTIES_IMAGE` — policy upload (20260809)
- Bucket public, file path: `{userId}-{timestamp}-{sanitizedFileName}`
- Multi-image: `parseImages(imageUrl)` → array (handle single URL, JSON array, array literal)
- Upload hanya diizinkan bila: `bucket_id = 'PROPERTIES_IMAGE'`, `owner_id = auth.uid()::text`, `(metadata->>'mimetype')` ∈ whitelist (`image/jpeg`, `image/png`, `image/webp`, `image/avif`), ukuran ≤ 5MB
- Klien (SellPropertyPage) memvalidasi MIME + ekstensi + ukuran sebelum upload, pakai `{ contentType: file.type, upsert: false }`

## Functions & RPC (Security definer)
- `is_admin()` — cek `role='admin'` dari `auth.uid()`; **dipakai semua policy admin** (menghindari subquery self-referential yang memicu 42P17)
- `get_my_profile()` — email/whatsapp milik sendiri (owner-only); kini juga kembalikan `whatsapp_verified` (20260828)
- `set_whatsapp_verified(text)` — simpan nomor WhatsApp + set `whatsapp_verified=true` (owner-only, security definer; 20260828)
- `get_admin_users()` — daftar user lengkap + email/whatsapp (hanya admin); kini juga ekspos `is_super_admin` (20260815)
- `set_property_ai_analysis(uuid, jsonb)` — tulis cache AI (hanya service_role)
- `increment_forum_views(uuid)` — naikkan `forum_posts.views`
- `record_audit(...)` — catat `audit_logs` (hanya admin; identity dari `auth.uid()`, bukan input client)
- `guard_property_price_change()` — trigger: harga ≤15% langsung jadi; >15% ditahan (20260816)
- `log_price_change(...)` — rekam `price_history` (dipanggil guard harga)
- `set_saved_property_owner()` — trigger: isi `user_id` di `saved_properties` (20260818)
- Trigger `enforce_property_seller_type()` — validasi `seller_type` vs role penjual (20260805/06)
- Trigger `enforce_property_status_transition()` — non-admin hanya boleh `verified → sold`; admin/service bebas (20260813)
- Trigger `enforce_profile_role_change()` — role hanya bisa diubah admin (20260813)
- Trigger `enforce_role_super_guard()` — hanya super admin yang boleh ubah role/`is_super_admin`; admin terakhir dilindungi (20260815)
- Trigger `handle_new_user()` — auto-create profil saat signup (20260810)
- Trigger `handle_agent_approval()` — aplikasi agen approved → role='agent' + isi `agent_profiles` (termasuk **`nib`** sejak 20260826)

## API

### `/api/groq` (Vercel Serverless + Vite Dev Proxy)
- Proxy ke Groq API dengan `GROQ_API_KEY`
- **Auth (20260808)**: semua caller kirim `Authorization: Bearer <token>` (dari `src/utils/groqClient.js` → `getAuthHeaders()`); server verifikasi via `supabase.auth.getUser(token)` → `resolveUser(req)`
- **Rate limit**: 20 req/min per IP + per user (`u:{userId}`); purpose `investment` (InvestmentAnalyzer) **wajib login** (401 bila tidak) + **limit 8×/jam** (`INVESTMENT_LIMIT_MAX`)
- **Input sanitization**: null bytes, control characters, `<script>`, `data:text/html`, `vbscript:`
- **Output guard**: replace dangerous content with `[diblokir]`
- **Session limit**: 50 messages per IP per hour
- **Audit log**: in-memory ring buffer (1000 entries) — entri menyertakan `userId` bila terautentikasi
- **BLOCKED_PATTERNS**: block prompt injection (`DAN` sudah dihapus karena bentrok dengan kata "dan" bahasa Indonesia)
- Model: hanya `llama-3.3-70b-versatile`
- Purpose: `chat` (system: ID) atau `translation` (system: EN JSON-only)

## RLS Policies

> **PENTING (20260813)**: JANGAN pakai subquery ke tabel yang sama DI DALAM policy (mis. `select status from properties where id = ...`) — memicu `42P17 infinite recursion` karena tabel ber-RLS. Solusinya: (1) policy dibuat sederhana, (2) validasi transisi dipindah ke trigger (`OLD`/`NEW`), (3) cek admin via `public.is_admin()` (security definer → tanpa RLS).

### `properties`
- Anyone can view verified (`status = 'verified'`)
- Sellers can view own (`auth.uid() = seller_id`)
- Admins can view all (`public.is_admin()`)
- Sellers can insert own (`auth.uid() = seller_id`)
- Sellers can update own: `using (auth.uid() = seller_id) with check (auth.uid() = seller_id)` — **tanpa subquery**
- Admins can update all / any: `using (public.is_admin()) with check (public.is_admin())`
- Sellers/admins can delete own/all
- **Transisi status di-trigger** `enforce_property_status_transition()`: non-admin hanya boleh `verified → sold`; admin/service bebas

### `profiles`
- Publik: `GRANT SELECT (id, first_name, role)` saja — **email/whatsapp privat** (dibaca via RPC `get_my_profile()`); `whatsapp_verified` juga dibaca via RPC `get_my_profile()` (20260828)
- Users can insert own: `with check (auth.uid() = id AND role = 'pembeli')`
- Users can update own: `using (auth.uid() = id) with check (auth.uid() = id)` — **tanpa subquery**
- Admins can update all profiles / delete: `public.is_admin()`
- **Role guard di-trigger** `enforce_profile_role_change()`: role hanya bisa diubah admin (non-admin tidak bisa self-promote)

### `saved_properties`
- Users can select/insert/delete only their own (`auth.uid() = user_id`)
- **Trigger `set_saved_property_owner`**: BEFORE INSERT mengisi `user_id = auth.uid()` bila kosong (klien tidak mengirim `user_id`)

### `whatsapp_leads`
- Insert: **wajib login** (`auth.uid() is not null` — 20260818, menggantikan `with check (true)`)
- Select: seller utk properti sendiri (`exists properties.seller_id = auth.uid()`) + admin

### `site_visits`
- Buyer: select/insert milik sendiri; update hanya ke 'cancelled'
- Seller: select utk propertinya sendiri; admin: select semua (20260818)

## SEO
- **useSEO hook** (`src/hooks/useSEO.js`): sets `document.title`, meta description, `og:title`, `og:description`, `og:image`, `og:url`
- Dipanggil di ExplorePage, PropertyDetailPage, SellPropertyPage, KprCalculatorPage, NotFoundPage, **AgentApplicationPage**, **SellerProfilePage**
- **`index.html`**: `<meta name="robots" content="index, follow">`, `<link rel="canonical" href="https://hunione.com/">`, Open Graph tags (`og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:image`), Twitter Card (`summary_large_image`)
- **`public/robots.txt`**: allow all, sitemap reference

## Error Handling
- **ErrorBoundary** (`src/components/ErrorBoundary.jsx`): class component, catches render errors, shows reload button + dev stack trace
- Semua async effect pakai `cancelledRef` untuk cegah state update setelah unmount
- Image fallback: semua `<img>` dari DB punya `onError` → `FALLBACK_IMAGE` (exported dari `utils/images.js`)

## Code Splitting
- Semua route components di `App.jsx` pakai `React.lazy()` + `Suspense` dengan `PageLoader` spinner — **kecuali `LegalPage` (`/terms` & `/privacy`) yang eager-import** (12 Agustus 2026) agar halaman legal selalu render instan tanpa risiko blank/stuck spinner saat chunk lambat/cache stale
- Bundle size: 849KB → 671KB (gzip 199KB)

## Keamanan
- **RLS tanpa 42P17 (20260813)**: semua policy update sederhana; cek admin via `is_admin()`; transisi status/role di-trigger
- **Profiles**: email/whatsapp privat (column-level grant), role terkunci (insert `pembeli`, trigger role-guard)
- **Super Admin Guard (20260815)**: kolom `is_super_admin`; hanya super admin yang bisa ubah role/is_super_admin; admin biasa tidak bisa menaikkan siapa pun; admin terakhir tidak bisa diturunkan
- **Properties**: seller tidak bisa ubah status (hanya `verified → sold`); admin via `is_admin()`; **guard harga** (20260816) — perubahan >15% ditahan menunggu persetujuan admin
- **WhatsApp leads (20260818)**: INSERT wajib login (anti spam anonim)
- **Favorit (20260818)**: `user_id` diisi server-side via trigger (anti salah-user)
- **Auth di `/api/groq`**: verifikasi Bearer token (Supabase), rate limit per user + per IP, purpose `investment` wajib login (8×/jam)
- **Validasi input auth (20260826)**: password min 8 + huruf besar/kecil/angka; nomor WhatsApp valid (08/62/+62, 10-14 digit) & dinormalisasi saat signUp; inline field errors (bukan native HTML5)
- **Real-time role sync (20260826)**: `AuthContext` subscribe Realtime pada `profiles` (filter id user) → `setRole` seketika saat admin ubah role; `ProfileDrawer` pakai `useAuth().role` (single source of truth)
- **Upload validasi**: whitelist MIME (jpeg/png/webp/avif) + ukuran ≤ 5MB (policy storage + cek di klien)
- **Forum RLS**: post/reply hanya author + admin; views via RPC security definer
- **Auto-create profil** saat signup (trigger `handle_new_user`)
- **Cache AI** hanya bisa ditulis server (RPC service_role)
- Input/output sanitization di Groq proxy
- CSP di vercel.json: `script-src 'self'` (tanpa `unsafe-inline`), CORS locked ke hunione.com
- `auth.uid()` tidak bisa dipalsukan; audit log identity dari `auth.uid()`

## Konvensi Kode
- `useAuth()` → `{ session, user, loading, showToast, signOut, role }`. `signOut` via `handleLogout` dari App. `showToast(msg, type, action?)` — `action = { label, onClick }` untuk tombol di toast (mis. Undo)
- Color palette: `brand-primary` (#1E3A5F), `brand-accent` (#4A90E2), `brand-bg` (#F8FAFC), `brand-surface` (#FFFFFF), `brand-text` (#1C2733), `brand-muted` (#6B7280), `brand-border` (#E5E7EB), `brand-highlight` (#EDF4FD), `brand-verified` (#2E8B57), `brand-danger` (#DC2626)
- Logo: `public/huniOne.svg` via `<img>` (viewBox-based)
- Shared utils: `format.js` (formatPrice, formatCurrency, formatCount), `avatar.js` (getAvatarColor, getInitials), `time.js` (timeAgo), `favorites.js` (setSupabase, initFavorites, toggleFavorite), `images.js` (parseImages, FALLBACK_IMAGE, getImageSrc), `markdown.js` (parseBlocks, tokenizeInline, isSafeUrl), `compare.js` (MAX_ITEMS=3, getCompareList, addToCompare, removeFromCompare, isInCompare, clearCompare), `recentlyViewed.js` (get/remove/clear/addRecentlyViewed, CHANGE_EVENT), `financialProfile.js` (getFinancialProfile, saveFinancialProfile, computeAffordability, maxAffordablePrice, estimateMonthlyInstallment, BUYING_POWER_ASSUMPTION), `groqClient.js` (`getAuthHeaders()` — baca token session untuk `Authorization: Bearer` ke `/api/groq`)
- Custom events untuk integrasi antar komponen: `compare-updated`, `recently-viewed-changed`, `financial-profile-saved`, `open-financial-profile`, `open-hunibot-question`, `open-hunibot`
- Footer: mega footer (kolom logo+newsletter **fungsional** → tabel `newsletter_subscribers`, 3 grup nav, kontak) + trust badges (tanpa app badges) + contact (email resmi `officialhunione@gmail.com` — kartu satu baris, tombol Tanya HuniBot) + social links real (Instagram, TikTok) + **legal links** (Syarat & Ketentuan `/terms`, Kebijakan Privasi `/privacy`) + **scroll-to-top button** (muncul scrollY > 400); newsletter state di-persist ke localStorage (key `hunione_newsletter_subscribed`)

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
11. `20260803_agent_directory.sql` — tabel `agent_profiles` + `agent_reviews`, view `agent_stats`, `handle_agent_approval()` trigger
12. `20260803_property_listing_enhancements.sql` — constraint `property_type` + kolom `is_premium`
13. `20260804_audit_log_security.sql` — RPC `record_audit` (security definer, hanya admin) + `audit_logs` dikunci
14. `20260805_property_seller_type.sql` — kolom `seller_type`/`agent_id`/`owner_id` + trigger `enforce_property_seller_type()`
15. `20260806_agent_integrity_fixes.sql` — policy insert `agent_profiles` (role agent), view `agent_stats` fix (`seller_type='agent'`), trigger hanya validasi saat kolom berubah
16. `20260807_agent_directory_completion.sql` — selesaikan direktori agen (drop kolom mati `properties.agent_id`/`owner_id`)
17. `20260808_security_hardening.sql` — **RLS profiles/properties**: normalisasi role + constraint, email privat, role guard, cache AI via RPC `set_property_ai_analysis` (service_role), RPC `get_my_profile`/`get_admin_users`
18. `20260808_admin_delete_agent_applications.sql` — policy DELETE `agent_applications` (admin) + action audit `delete_agent_application`
19. `20260809_storage_upload_policy.sql` — policy upload storage (whitelist mimetype `metadata->>'mimetype'`, `owner_id = auth.uid()::text`)
20. `20260809_drop_legacy_audit_columns.sql` — hapus kolom audit lama yang tidak dipakai
21. `20260810_forum_rls_and_handle_new_user.sql` — RLS `forum_posts`/`forum_replies` (author+admin), RPC `increment_forum_views`, trigger `handle_new_user()` (auto-create profil saat signup)
22. `20260811_seller_can_mark_sold.sql` — seller boleh `verified → sold` *(DIGANTIKAN oleh 20260813 — masih ada bug 42P17)*
23. `20260812_seller_mark_sold_any_status.sql` — seller boleh `sold` dari status apa pun *(DIGANTIKAN oleh 20260813 — masih ada bug 42P17)*
24. `20260813_fix_rls_recursion.sql` — **fix 42P17**: helper `is_admin()`, policy sederhana (tanpa subquery self-ref), trigger `enforce_property_status_transition()` + `enforce_profile_role_change()`
25. `20260815_admin_super_admin_role_guard.sql` — kolom `is_super_admin`, trigger `enforce_role_super_guard()`, admin lama otomatis jadi super admin, `get_admin_users()` ekspos `is_super_admin`
26. `20260816_price_history.sql` — kolom `properties.original_price`, tabel `price_history`, `log_price_change()`, update `guard_property_price_change()`
27. `20260816_property_price_change_guard.sql` — kolom harga (`price_requested`, `price_change_status`, dll) + trigger guard ≤15% → langsung, >15% → antrian admin
28. `20260816_whatsapp_leads.sql` — tabel `whatsapp_leads` + RLS (insert publik, select seller/admin)
29. `20260817_saved_searches.sql` — tabel `saved_searches` + RLS owner-only
30. `20260818_security_gap_fixes.sql` — **penutup celah audit**: trigger `saved_properties` (user_id otomatis), agent_profiles self-read, whatsapp_leads wajib login, site_visits select seller/admin
31. `20260819_property_reports.sql` — tabel `property_reports` + RLS (pelapor/admin) + audit `delete_property`/`dismiss_report` + policy hapus foto storage admin
32. `20260820_property_published_at.sql` — kolom `properties.published_at` + trigger `set_property_published_at()` (definisi "properti baru" saat status → verified)
33. `20260820_seller_survey_visits.sql` — alur survei sisi seller: policy UPDATE `site_visits` (seller/admin) + realtime `site_visits`
34. `20260821_chat_read_receipts.sql` — kolom `direct_messages.read_at` + policy UPDATE receiver + realtime `direct_messages`
35. `20260822_property_price_period.sql` — kolom `properties.price_period` ('total'/'bulan'/'tahun') + backfill sewa → 'bulan'
36. `20260823_property_detail_fields.sql` — kolom `properties.land_area_sqm` & `furnished` (kondisi isi properti sewa)
37. `20260824_create_newsletter_subscribers.sql` — tabel `newsletter_subscribers` + RLS (INSERT publik, SELECT/UPDATE/DELETE admin-only)
38. `20260826_add_nib_to_agents.sql` — kolom `nib` di `agent_applications` & `agent_profiles` + update trigger `handle_agent_approval()` menyalin `nib` saat approval
39. `20260828_whatsapp_verification.sql` — kolom `whatsapp_verified` (bool) di `profiles`; update trigger `handle_new_user()`; backfill user dgn WhatsApp; perpanjang RPC `get_my_profile()` (+`whatsapp_verified`); RPC baru `set_whatsapp_verified(text)`

**Catatan**: PostgreSQL 14 tidak support `CREATE POLICY IF NOT EXISTS` — harus pakai `DROP POLICY IF EXISTS` dulu sebelum `CREATE POLICY`. Migration terbaru memakai blok `do $$ ... exception when duplicate_object` untuk idempotency.
