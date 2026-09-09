# HuniOne — Ringkasan Proyek untuk Gemini AI

Platform properti (jual/beli/sewa) dengan AI chatbot, realtime chat (read receipt), forum komunitas, bandingkan properti, **direktori agen publik**, pendaftaran agen, **dukungan properti sewa penuh**, **lapor iklan**, admin dashboard. Deploy di Vercel (SPA + serverless) — domain **hunione.com**. Pembaruan terakhir: 9 September 2026.

## Analisis Arsitektur Fitur Chat — ChatHubPage.jsx (31 Agustus 2026)
Ringkasan arsitektur & temuan dari analisis menyeluruh fitur chat realtime (2.490 baris, komponen multipanel: daftar kontak kiri + ruang chat kanan + panel kontak).

### Alur data inti (4 lapis)
1. **Kontak** (`useEffect [userId]`): query `direct_messages` (.or sender/receiver, limit 500, order desc) → kumpulkan `contactIds` + `lastMessageMap` + `unreadCounts` (hitung bila `receiver_id === me && !read_at`), lalu ambil profil (`first_name, role`). Kontak agen/dev/admin **tanpa percakapan** juga ditambahkan. Di-sort by `last_message_at` desc (fallback abjad). Perubahan realtime pesan masuk memutakhirkan list via `setContacts` (reorder ke atas + preview, lihat `ChatHubPage.jsx:970`).
2. **Pesan** (`useEffect [activeContactId, userId]`): `.or(and(me→contact), and(contact→me))`, `select('*')`, order desc, `limit(PAGE_SIZE=50)`, setelah diambil di-`.reverse()` (ascending) + `scrollToLatest()`. `loadEarlier()` memuat 50 pesan sebelum `messages[0].created_at` (`.lt`).
3. **Realtime** (`useEffect [userId, showToast]`, channel tunggal `direct-messages-${userId}`): mendengarkan `INSERT` & `UPDATE` `postgres_changes` **tanpa filter** (perbaikan #2), memakai guard client-side `sender_id/receiver_id` + RLS. Kontak aktif dibaca via `activeContactIdRef`; auto-scroll via `scrollToLatestRef`. Guard `HUNIBOT_ID` & echo sendiri (`sender_id === userId`).
4. **Presence/typing/read/pin** (channel terpisah): `chat-typing-${room}` (presence, last message = typing), `chat-presence-track` (presence online tunggal, sejak 7 September pasca-penggabungan), `pinned_messages` (fetch per room), `read_at` diupdate via bulk `.update()`.

### Fitur yang ada
Kirim teks/gambar/properti (`handleSend`/`handleSendImage` — opt-in `temp-*` id lalu diganti `data[0]`), balas/reply (`reply_to_id`), pin pesan (`pinned_messages`), hapus (soft-delete `deleted_at`), ekspor chat (file), search-in-chat (`chatSearchQ`), search-in-workspace, unread badge (`unreadMap`) + Mark All Read, status typing/online, indicator read_receipt, context property card via `?property=`, auto-select kontak via `?user=`.

### Temuan penting (cek sebelum perubahan berikutnya)
- **Kontak bergantung pada `.or()` di `direct_messages`**: `fetchContacts` & `fetchMessages` memakai operator `or(...)` pada **query (bukan realtime filter)** — ini valid & didukung, jadi tetap berfungsi. Hanya *realtime* `postgres_changes.filter` yang tidak mendukung `or` (sudah dihapus).
- **Update `read_at` memicu event realtime `UPDATE`**: handler `UPDATE` hanya menyinkronkan `read_at`/`deleted_at` ke baris yang sama — aman, tidak mengganggu daftar kontak.
- **Delete = soft-delete** (`deleted_at`), masih tersisa di DB; tidak ada handler `DELETE` realtime (tidak diperlukan karena soft-delete melewati `UPDATE`).
- **`unreadMap` di-zero** saat `handleSelectContact`, `handleMarkAllRead`, dan `markRead` (bila buka chat). Konsisten dengan sidebar.
- **Race duplikat sudah diamankan** oleh guard `sender_id === userId` (INSERT) + dedup `prev.some(id)` — pesan optimistik `temp-*` tidak dobel.
- **PAGE_SIZE = 50**; `hasMore` di-set dari `data.length === PAGE_SIZE`.

### Inventaris Fitur Lengkap (kondisi 8 September 2026)
Kirim teks/gambar/properti/PDF-dokumen/**pesan suara** (voice note ala WhatsApp: `MediaRecorder` → bucket `CHAT_VOICE` → pemutar audio custom Play/Pause + progress bar + durasi); **lampiran multi-file ala WhatsApp** (staging + drawer pratinjau: thumbnail/ikon, nama, ukuran, hapus per-file, caption opsional, kirim berurutan — bucket `CHAT_IMAGES`/`CHAT_FILES`); reply + jump-to-original; pin/unpin; soft-delete; ekspor CSV (BOM + delimiter `;`); search-in-chat dengan highlight & navigasi hasil; unread badge + Mark All Read; typing indicator (presence per room, 2,5s debounce); online status; read receipt (✓/✓✓); bookmark star + filter tab & chip `⭐ N`; **reaksi 6 emoji** dengan **pill gabungan ala WhatsApp** (ikon emoji ber-tumpuk dalam satu kapsul + total angka, `ReactionSummary` bottom-sheet dengan tab antar-emoji & tombol hapus reaksiku) + **double tap reaksi cepat** (`❤️`, toggle — desktop `onDoubleClick`, mobile deteksi touch ganda) dan **menu aksi pesan ala WhatsApp Web** (tombol `ChevronDown` hanya saat hover → popover melayang berisi baris emoji cepat + daftar aksi Balas/Reaksi/Salin/Sematkan/Bookmark/Hapus, tutup on click-outside); drag-drop gambar (JPG/PNG/WEBP/AVIF ≤5MB, kompresi); sound/notifikasi browser (persist localStorage); last seen; retry/error state kontak & pesan; divider "● Pesan Baru"; layout desktop lebar (`2xl:max-w-[1600px]`, panel `xl:w-96`, bubble `xl:max-w-[70%]`); deep-link `?user=&property=`; draft per-kontak (localStorage); deteksi nomor → link wa.me; gambar/foto bisa dibuka preview penuh; **komposer kapsul ala Telegram** (satu capsule rounded-full: input + paperclip di ujung kanan dalam, tombol aksi bulat di samping — Mic saat kosong untuk **pesan suara/voice note** ala WhatsApp, Send saat terisi) dengan `safe-area-inset-bottom` ter-cap (tanpa gap berlebih di atas gesture bar), **footer sadar-keyboard via `visualViewport`** (tinggi kontainer chat mengikuti area terlihat agar komposer/reply-preview selalu menempel rapat ke atas keyboard tanpa gap putih), dan **voice note recording UI** (tombol Mic → izin mic + `MediaRecorder`, timer + titik merah berkedip + tombol trash di dalam kapsul, kirim ke bucket `CHAT_VOICE`).

### Daftar Risiko Arsitektural (temuan analisis mendalam)
- **1. Monolith & re-render massal**: `ChatHubPage` ~3.500 baris dengan ~80 state + 20 ref; seluruh sub-komponen tidak di-`memo` → setiap perubahan state kecil (hover reaksi, ketik draft) me-render ulang semua bubble. Lookup `repliedMessage` per pesan via `.find()` = **O(n²)** pada daftar pesan. → **Sudah dioptimasi** (lihat changelog 7 September di atas): `React.memo` pada `MessageBubble`/`ContactItem`/`DateSeparator`/`TypingDots`, handler di-`useCallback` (baca state via ref mirror `reactionsMapRef`/`pinnedMessagesRef`/`starredMessagesRef`), kalkulasi berat di-`useMemo` (`searchMatches`, `replyIndex`, `filteredContacts`, `visibleContacts`, `starCountFor`).
- **2. Cache tak dibersihkan antar room**: `reactionsMap` & `pinnedMessages` menumpuk selama sesi (key per room `[a,b].sort().join('-')`). → **Sudah dioptimasi**: di-reset saat ganti room di effect `[activeContactId, userId, messagesRetryCounter]` (guard `lastCleanupRoomRef`), lalu di-fetch ulang otomatis.
- **3. Channel presence ganda**: `app-online` + `chat-presence-track` mengirim data `onlineIds` identik (dua Supabase channel). → **Sudah digabung** (lihat changelog 7 September): effect `app-online` dihapus, `chat-presence-track` kini menjadi satu-satunya channel presence (tetap mengekspos `track({ userId, online_at })` + timer `last_seen_at` 60s).
- **4. Tanpa error boundary / virtualisasi**: `PropertyMessage` bisa men-cegah render seluruh halaman bila throw; seluruh bubble `PAGE_SIZE×N` dirender ke DOM tanpa windowing. → **Sebagian diatasi**: `ChatErrorBoundary` (class component) membungkus tiap render bubble + kartu `PropertyMessage` sehingga error render satu pesan tidak meng-crash seluruh halaman chat (fallback "Muat ulang"). Virtualisasi/windowing bubble belum dilakukan.
- **5. Rendering O(n²) & tanpa memo lanjutan**: `MessageBubble` gelombang re-render saat `messageNamesMap` berubah (nama reaksi dimuat) karena `handleShowReactionSummary` depend pada map tsb. → **Sudah diatasi (7 September)**: `messageNamesMap` dibaca lewat ref mirror (`messageNamesMapRef`), jadi `handleShowReactionSummary` stabil dengan deps `[userId]` saja — memuat nama reaksi tidak lagi me-render ulang seluruh bubble. Lookup nama per user tetap O(1) (object keyed by id) dan nama yang sudah diketahui dilewati dari fetch.
- **6. Stale-closure kelas ringan**: `scrollToLatestRef` & `chatSettingsRef` di-assign tiap render (pola disengaja untuk callback realtime) — aman, namun hindari menambah pola serupa tanpa ref.
- **7. RLS belum terverifikasi penuh**: `CHAT_IMAGES` bucket & `message_reactions` RLS tidak diverifikasi dari migration (hanya `CHAT_FILES`, `chat_stars`, `pinned_messages` yang eksplisit). → **Terverifikasi memadai (7 September)**: `message_reactions` punya SELECT participant-only (`20260831_whatsapp_chat_features.sql`), INSERT participant-only + `auth.uid() = user_id` (`20260831_chat_reactions_rls_participant.sql`), DELETE owner-only, tanpa policy UPDATE (default deny). Bucket `CHAT_IMAGES` (public, 5MB, whitelist MIME) ter-hardening di `20260830_chat_reply_attachments.sql` — upload/update/delete hanya ke folder `{uid}/`. Tidak ada celah yang perlu migration baru.
- **8. API lama**: `document.execCommand('copy')` (deprecated) sebagai fallback di `handleCopyMessage`. → **Sudah diatasi (7 September)**: `navigator.clipboard.writeText()` sebagai jalur primer, fallback legacy hanya dipakai bila clipboard API gagal — kini memverifikasi nilai kembali `execCommand` (boolean) + pembersihan textarea dengan `finally`, dan menyalin teks tetap apa adanya (`text` hasil trim, bukan `msg.content` mentah).

## Changelog — Chat: Pesan Suara (Voice Note) ala WhatsApp (8 September 2026)
- **Perekaman**: tombol Mic di komposer (saat kosong) meminta izin `getUserMedia({ audio: true })`, merekam via `MediaRecorder` ke chunks (MIME disesuaikan dukungan browser: `audio/webm;codecs=opus` → `audio/mp4` → `audio/ogg`), timer maju `00:00..` dengan batas 10 menit. Error izin ditolak / mikrofon tidak ada / perekaman tak didukung ditangani via toast.
- **Recording UI di dalam kapsul komposer**: `textarea` & paperclip disembunyikan; diganti tombol Tong Sampah merah (batalkan), titik merah berkedip (`voice-rec-dot`) + timer; tombol aksi bulat berubah menjadi **Kirim** (pesawat kertas). Saat Kirim: recorder di-`stop()` dn menunggu chunk akhir, blob diunggah lalu kirim pesan.
- **Storage**: bucket baru `CHAT_VOICE` (migration `20260908_chat_voice_notes.sql`, `allowed_mime_types` audio/webm|mp4|ogg|mpeg|x-m4a|aac|wav, limit 20MB, jalur `{uid}/...`, policy upload/update/delete milik sendiri). Pesan disimpan di `direct_messages` dengan `file_url`, `file_name='Pesan suara'`, `file_size`, `file_type=audio/*`.
- **Custom audio player** (tanpa `<audio controls>` bawaan): komponen `VoiceMessagePlayer` (memo terpisah) berisi tombol Play/Pause bundar, progress bar `input[type=range]` bergaya HuniOne (fill `brand-accent`, thumb putih; di bubble milik sendiri gunakan putih di atas gradient navy), dan teks durasi `m:ss`. Deteksi via `file_type` berawalan `audio/`; `ReplySnippet` menampilkan ikon `Mic`.
- Pembersihan: track di-`stop()` saat batal/kirim/ganti kontak/unmount; guard anti-dobel-klik mic; input teks tetap tersembunyi selama merekam.
- Lint bersih (`eslint`) + build sukses (`vite`). Commit: `0890869`.

## Changelog — Chat: Audio Compression & Waveform Visual (9 September 2026)
- **Meningkatkan voice note** (`ChatHubPage.jsx`) dengan dua peningkatan: **kompresi audio sebelum upload** dan **waveform visual** menggantikan progress bar `input[type=range]` lama.
- **Kompresi audio** (`src/utils/audioCompression.js` — baru): sebelum di-upload ke bucket `CHAT_VOICE`, blob hasil `MediaRecorder` di-**decode ulang** lewat Web Audio API (`AudioContext` dengan `sampleRate=16000` untuk voice-optimized), kemudian di-**re-encode** melalui pipeline `MediaRecorder` dari `AudioBufferSourceNode` → `MediaStreamDestination`, menghasilkan output mono 16kHz dengan codec terkompresi (webm/opus → ogg/opus → mp4). File lebih kecil dibanding rekaman asli (heuristic: hasil diterima hanya bila `outBlob.size < blob.size`, jika tidak pakai blob asli). `recompressVoiceBlob()` mengembalikan `{ blob, compressed, duration, mime }`; fallback safety bila `MediaRecorder`/`AudioContext` tak tersedia atau decode gagal → kirim original, tanpa crash.
- **Ekstraksi waveform** (`extractWaveformPeaks(buffer, buckets=60)`): ambil channel mono, hitung peak per bucket (`max*0.5 + avg*0.5`) → array 60 nilai 0..1 yang dikirim ke komponen waveform.
- **`src/components/VoiceWaveform.jsx`** (baru): komponen Canvas-based bar-waveform ala WhatsApp/Spotify. Bar dibulatkan (`roundRect` dengan fallback `rect`), posisi di tengah vertikal, tinggi proporsional amplitudo. **Progress fill**: setiap bar yang melewati posisi `progressX` diwarnai `accent`, sisanya `trackColor` — memberikan efek waveform "terisi" saat playback. **Click-to-seek** via koordinat klik relatif terhadap lebar canvas → `onSeek(ratio)` memanggil `audio.currentTime = ratio * duration`. Render ulang via `useEffect` + `ResizeObserver` (ramah DPR via `devicePixelRatio`), `memo` untuk hindari re-render tak perlu, `aria-role="slider"` untuk aksesibilitas.
- **`VoiceMessagePlayer` diperbarui**: progress bar range diganti `VoiceWaveform`. Peaks di-fetch lazily dari `message.file_url` (decode saat bubble tampil) disimpan di state `peaks`, dengan `cancelled` flag + `ctx.close()` cleanup di efek (hindari audiocontext bocor). Durasi di-set dari metadata audio buffer bila belum ada. Komponen tetap `memo`.
- **`handleSendVoice` diperbarui**: setelah blob dibentuk & divalidasi (tidak kosong), dipanggil `recompressVoiceBlob(blob)` → jika berhasil dipakai `uploadBlob` + `uploadMime` baru (dipakai untuk `contentType` upload, `file_size`, `file_type`, dan `voiceExtForMime` di nama file). Semua di dalam `try/catch` — kegagalan kompresi selalu fallback ke blob asli, tidak pernah menghalangi pengiriman.
- **Hardening error-handling (`audioCompression.js`)**: `blob.arrayBuffer()` dibungkus `try/catch` (blob invalid → fallback); `recompressVoiceBlob` kini menolak durasi `NaN`/≤0, membungkus pembuatan `BufferSource`/`MediaStreamDestination` dalam `try/catch`, menangkap `recorder.onerror` (selain `onstop`) agar promise `done` **tidak pernah hang**, dan memasang **timeout pengaman kedua** (`+2,5s`) untuk memaksa `stop()` bila `ended`/chunk tidak sampai — mencegah upload voice menggantung selamanya di browser yang lambat/error. `toMono` & `extractWaveformPeaks` aman terhadap buffer 0-channel/0-sampel (kembalikan array kosong, bukan error).
- **Perilaku browser automatis/headless**: fitur voice note bergantung pada `navigator.mediaDevices.getUserMedia({audio:true})` yang **ditolak otomatis tanpa prompt** di headless/incognito default → `handleStartRecording` menangkap kegagalan izin dengan `showToast('Izin mikrofon ditolak...')` (`ChatHubPage.jsx:~2877`). Fitur **tidak crash** saat `MediaRecorder`/`AudioContext` tak tersedia (guard + fallback ke blob asli + upload original). Voice note hanya berfungsi penuh di browser normal dengan izin mikroton diizinkan.
- **`index.css`**: `.voice-range` (CSS range slider) dihapus karena tidak lagi dipakai — diganti canvas waveform. `.voice-rec-dot` tetap.
- Skope hanya frontend (ChatHubPage, VoiceWaveform baru, audioCompression baru, index.css). Tanpa migration/DB (bucket `CHAT_VOICE` & kolom `direct_messages` sudah ada sejak changelog voice note sebelumnya). Lint bersih (`eslint`) + build sukses (`vite`). Commit: `9ab3eaf`.

## Changelog — Chat: Deteksi & Petunjuk Izin Mikrofon yang Lebih Pintar (9 September 2026)
- **Tujuan**: mengatasi kasus user (terutama desktop & mobile) yang sudah *Allow* tapi tetap "izin ditolak" atau tidak muncul popup — dengan memberi pesan yang spesifik tentang **di mana** harus memperbaiki, bukan sekadar toast generik.
- **Cek HTTPS dulu** (`startRecording`): sebelum memanggil `getUserMedia`, jika `window.location.protocol !== 'https:'` (dan bukan `localhost`), tampilkan toast "Mikrofon hanya tersedia di koneksi aman (HTTPS). Buka lewat https:// lalu coba lagi." — karena `getUserMedia` diblokir total tanpa popup di `http://` non-aman.
- **Pemicu popup otomatis + timeout anti-gantung**: `getUserMedia` dibungkus `withTimeout(promise, 10000)` — jika browser tidak pernah memunculkan popup (atau promise tidak settle dalam 10 detik), gagal dengan error `TimeoutRequestingMicrophone` → toast memberi tahu user bahwa izin mungkin diblokir lewat ikon gembok `🔒` di address bar. Ini mencegah tombol Mic "diam tanpa umpan balik" di desktop.
- **Deteksi status izin proaktif**: helper `checkMicPermission()` memakai `navigator.permissions.query({ name: 'microphone' })` untuk membaca state `granted` / `prompt` / `denied`. Saat `getUserMedia` gagal, `detectMicError(err)` memanggil fungsi ini dan memberi **petunjuk kontekstual**:
  - `denied` → "Mikrofon diblokir di browser. Klik ikon gembok/🔒 di address bar → izinkan mikrofon untuk situs ini → muat ulang, lalu tekan Mic lagi."
  - `NotAllowedError`/`PermissionDeniedError`/`SecurityError` → pesan izin ditolak dengan arah ke ikon gembok/pengaturan situs.
  - `NotFoundError`/`DevicesNotFoundError`/`OverconstrainedError` → "Tidak ada mikrofon yang terhubung. Periksa perangkat audio kamu."
  - `timeout` → pesan khusus (di atas); error lain → fallback `Gagal mengakses mikrofon: <msg>`.
- `micGuidanceFor(state, name)` memusatkan teks petunjuk; `detectMicError` memakai `sendMountedRef` sebagai guard async (hindari toast setelah unmount, mengikuti pola `cancelled`/`mounted` pada proyek ini).
- Skope hanya `ChatHubPage.jsx` (helper lokal `withTimeout`, `checkMicPermission`, `micGuidanceFor`, `detectMicError` + modifikasi `startRecording`). Tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `1761c44`.

## Changelog — Chat: Hardening & Toleransi Error Izin Mikrofon (9 September 2026)
- **Tujuan**: membuat perekaman suara jauh lebih toleran terhadap state browser yang "macet" (popup tak muncul, izin menempel di status diblokir palsu), sekaligus menegaskan pengecekan protokol/perangkat dan mengamankan inisialisasi `MediaRecorder` lintas perangkat (Android Chrome, iOS Safari, Desktop).
- **(1) Reset pengecekan protokol, lebih eksplisit**: cek keamanan kini memakai `window.isSecureContext === true && /^https:/.test(protocol)` dengan pengecualian `localhost`/`127.0.0.1`/`::1`. Pesan toast diperjelas: *"Mikrofon diblokir karena koneksi tidak aman (bukan HTTPS). Browser tidak mengizinkan akses mikrofon di http://. Buka lewat https:// lalu coba lagi."* — karena di `http://` non-aman, `getUserMedia` ditolak total **tanpa popup**.
- **(2) Pemeriksaan perangkat audio**: helper `getAudioInputDevices()` memanggil `navigator.mediaDevices.enumerateDevices()` (filter `kind === 'audioinput'`). Di `startRecording`, jika tidak ada audio input (`count === 0`) → toast *"Tidak ditemukan mikrofon di perangkat ini. Periksa/colok mikrofon..."*; jika ada perangkat tapi `getUserMedia` gagal `NotFoundError`/`OverconstrainedError` → anjuran "*cabut & pasang ulang lalu coba lagi*". Browser tanpa `enumerateDevices` akrab di-abaikan (`count:-1`).
- **(3) Fallback / retry otomatis (anti-lock)**: ketika `getUserMedia` gagal karena izin yang "macet" (mencakup `NotAllowedError`, `PermissionDeniedError`, `SecurityError`, dan `TimeoutRequestingMicrophone`), `scheduleMicRetry(err)` memicu **satu kali retry otomatis** setelah ~1,5 detik via `micRetryTimerRef`, asalkan `micRetryCountRef.current < 1`. `micRetryCountRef` di-reset (`=0`) hanya setelah perekaman **berhasil** dimulai, jadi tombol Mic tidak pernah terkunci permanen dalam status "diblokir palsu". `micRetryTimerRef` dibersihkan saat unmount (bergabung dengan `sendMountedRef=false`). Pesan `state==='prompt'` memberi tahu user bahwa popup izin sedang/mau diminta + retry otomatis; `state==='denied'` menunjukkan arah ikon gembok `🔒` + retry.
- **(4) Inisialisasi `MediaRecorder` yang aman lintas perangkat**: `pickVoiceMime()` kini mengembalikan objek `{ mime, type }` dan mencoba **9 kandidat MIME** berurutan (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/mp4;codecs=mp4a.40.2`, `audio/x-m4a`, `audio/ogg;codecs=opus`, `audio/ogg`, `audio/mpeg`, `audio/aac`) — mencakup Android Chrome (WebM/Opus), iOS Safari (mp4/m4a), dan Desktop (beragam). Setiap kandidat divalidasi `MediaRecorder.isTypeSupported`. `new MediaRecorder(stream, options)` dibungkus `try/catch` → bila gagal (opsi mime ditolak) fallback ke `new MediaRecorder(stream)` tanpa `mimeType` (biarkan browser tentukan default); bila masih gagal, stream di-`stop()` + toast codec tak didukung (tidak crash). Helper `voiceBaseMime(mime)` menormalkan objek → string `type` dasar (dipakai untuk `Blob` dan upload). `recorder.onerror` memanggil `stop()` agar error runtime tidak menggantung.
- Skope hanya `ChatHubPage.jsx`. Tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `edff415`.

## Changelog — Chat: Reset State Error Mikrofon & Hindari Vonis "Blokir" Prematur (9 September 2026)
- **Tujuan**: memperbaiki kasus di mana, meski izin macOS + browser (`Allow on every visit`) sudah aktif & halaman direfresh, toast/banner error mikrofon merah kadang masih "tersangkut" dan muncul tanpa memberi kesempatan `getUserMedia` dieksekusi ulang untuk sukses.
- **(1) State error persisten yang bisa di-reset**: tambah state `micError` (string) di `ChatHubPage`. Semua umpan balik error mikrofon (izin ditolak, timeout, perangkat tidak ada, non-HTTPS) kini ditulis ke `setMicError(...)` (banner merah persisten) **dan** `showToast`. Banner divisualkan di atas komposer dengan tombol tutup (`X`, `setMicError('')`). Karena state-nya nyata & bisa di-nol-kan, `startRecording` memanggil `if (micError) setMicError('')` **sebelum** melangkah ke `getUserMedia` — setiap klik tombol Mic membersihkan total sisa error sebelumnya → tidak ada error lama yang "menempel" dan memblokir percobaan baru.
- **(2) Tidak menjatuhkan vonis "diblokir" sebelum promise merespons**: `micGuidanceFor` tidak lagi menjadikan `permissions.query == 'denied'` sebagai **satu-satunya dasar** untuk menampilkan "Mikrofon diblokir". Vonis "Izin mikrofon ditolak/diblokir" hanya muncul ketika `getUserMedia` **benar-benar** menolak dengan `NotAllowedError`/`PermissionDeniedError`/`SecurityError`. Hasil `permissions.query` hanya dipakai untuk **memperkaya** pesan (mis. menyebut "Allow on every visit" saat state `denied`), bukan sebagai dasar vonis tunggal. `state==='prompt'` hanya menampilkan pesan "browser sedang meminta izin", bukan "diblokir".
- **(3) Reset juga setelah sukses**: `micError` di-nol-kan lagi setelah `getUserMedia` berhasil memberikan stream (`if (micError) setMicError('')`), sehingga banner hilang begitu rekaman berjalan.
- **(4) Retry otomatis tetap**: saat error retryable, `scheduleMicRetry` tetap memicu satu percobaan ulang ~1,5s lalu `startRecording()` yang juga melakukan reset state error — memberi layar kedua bagi `getUserMedia` untuk berhasil tanpa user harus menutup banner manual.
- Skope hanya `ChatHubPage.jsx`. Tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: (lihat git).

## Changelog — Chat: Double Tap untuk Reaksi Cepat Hati (8 September 2026)
- **Fitur baru**: ketuk 2x pada area pesan memunculkan reaksi `❤️` secara instan — di desktop lewat `onDoubleClick` pada bubble, di perangkat sentuh lewat deteksi double-tap bawaan (`handleTouchEnd`: dua ketukan ≤300ms, jarak antar ketukan <30px, pergerakan jari <10px).
- Terintegrasi dengan swipe-to-reply tanpa konflik: deteksi tap hanya berjalan bila `swipeX` di bawah threshold; interaksi pada tombol/link/gambar diabaikan agar aksi lain tidak dibajak; di perangkat sentuh `onDoubleClick` browser dinonaktifkan (`IS_TOUCH`) supaya tidak dobel-trigger.
- Melewati `handleToggleReaction` yang anti-spam yang sudah ada → otomatis toggle: menambah `❤️` bila belum ada, mencabut bila sudah; disertai efek pop (scale 1.04) halus pada bubble.
- Lint bersih (`eslint`) + build sukses (`vite`). Commit: `06e1aae`.

## Changelog — Chat: Hardening Responsif Mobile (8 September 2026)
- **Analisis gap mobile**: sisa jarak kosong di perangkat mobile berasal dari (1) *overscroll/rubber-band* iOS pada scroller pesan & daftar kontak yang menimbulkan ruang putih di tepi, (2) auto-zoom iOS saat fokus input berukuran <16px yang membuat layout melompat, dan (3) blok pencarian kontak tanpa `shrink-0` yang bisa tertekan di layar pendek.
- **Perbaikan**: `overscroll-none` pada messages scroller & daftar kontak (overscroll tidak menyebar → tanpa gap putih, pull-to-refresh tidak terpicu); textarea komposer + semua input pencarian chat kini `text-[16px]` di mobile (`md:text-sm` kembali) supaya iOS tidak auto-zoom saat fokus; blok pencarian kontak diberi `shrink-0` agar tetap statis di landscape pendek.
- Lint bersih (`eslint`) + build sukses (`vite`). Commit: `3cc8622`.

## Changelog — Chat: Pangkas Agresif Padding Kiri Input Komposer Kapsul (8 September 2026)
- **Lanjutan fix kerapatan**: setelah `pl-2.5` masih terlihat gap di mobile, padding kiri wrapper kapsul dipangkas lagi menjadi `pl-1.5` (6px) dan `<textarea>` diberi `pl-0` eksplisit — memastikan tidak ada padding kiri ganda (nested) pada elemen input maupun wrapper.
- Hasil: teks/placeholder "Tulis pesan..." dan kursor mulai benar-benar rapat di dekat lengkungan kiri kapsul tanpa jarak kosong berlebihan. Warna, posisi paperclip di ujung kanan dalam kapsul, dan tombol aksi bulat Mic/Send di luar kapsul tidak diubah.
- Lint bersih (`eslint`) + build sukses (`vite`). Commit: `d859fbd`.

## Changelog — Chat: Rapatkan Padding Kiri Input pada Komposer Kapsul (8 September 2026)
- **Masalah visual**: teks/placeholder "Tulis pesan..." di dalam kapsul komposer berjarak terlalu jauh dari tepi kiri kotak (padding kiri 16px).
- **Perbaikan**: padding kiri kapsul dikurangi `pl-4` → `pl-2.5` (10px), sehingga teks & kursor mulai lebih dekat dan proporsional dengan tepi kapsul ala WhatsApp. Warna eksisting, posisi paperclip di ujung kanan dalam kapsul, dan tombol aksi bulat Mic/Send di luar kapsul tidak diubah.
- Satu perubahan class; tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `3c55940`.

## Changelog — Chat: Komposer Kapsul ala Telegram (8 September 2026)
- **Satu wadah kapsul**: area input teks + tombol lampiran menyatu dalam capsule `rounded-full` (bg `brand-bg`, border `brand-border`, saat fokus ring aksen) alih-alih kotak input terpisah + tombol di luarnya.
- **Paperclip pindah ke dalam input**: tombol `Paperclip` kini di **ujung kanan dalam kapsul** (sebelum tombol aksi bulat); popover lampiran (Bagikan properti / Kirim gambar / Kirim dokumen) membuka ke **atas rata-kanan** (`right-0`) sehingga tidak meluber. Ikon emoji di kiri & pintasan kamera di kanan dalam input **tidak dipakai** sesuai referensi.
- **Tombol aksi bulat melayang** (di luar kapsul, kanan): saat kolom kosong (tanpa teks & tanpa file staged) menampilkan ikon **Mic** (voice note — placeholder/no-op); saat ada teks/gambar/staged files/properti → berubah jadi **Send** (paper plane) dengan spinner saat busy. Ukuran `w-11 h-11 rounded-full`, shadow halus.
- **Palet HuniOne**: tombol kirim `brand-primary` (navy `#1E3A5F`), hover/focus ring `brand-accent` (biru `#4A90E2`) — bukan hijau/gelap ala WhatsApp. Padding & safe-area (visualViewport sadar-keyboard) dipertahankan — tanpa gap putih saat keyboard muncul.
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `2282a70`.

## Changelog — Chat: Footer Rapat via VisualViewport saat Keyboard Mobile (8 September 2026)
- **Akar masalah**: saat swipe-to-reply memfokuskan input dan keyboard virtual naik, di beberapa browser Android/iOS (mode *overlay* keyboard yang tidak meresize layout viewport) tinggi kontainer chat tetap `100dvh` (tak menyusut oleh tinggi keyboard) → komposer terdorong ke bawah area terlihat, menyisakan ruang kosong/gap putih di atas keyboard & gesture bar.
- **Tinggi kontainer dinamis**: kontainer root chat (`ChatHubPage.jsx`) kini diberi `style.height` dari `window.visualViewport.height` (minus header 56px), diperbarui via listener `resize`/`scroll`/`orientationchange` (fallback `100dvh`). VisualViewport selalu mencerminkan area yang benar-benar terlihat — saat keyboard naik, tinggi chat menyusut persis ke atas keyboard sehingga footer menempel tanpa gap; saat toolbar browser menutup/membuka ikut adaptif.
- **Padding komposer sadar-keyboard**: state `keyboardOpen` terdeteksi bila `window.innerHeight` menyusut >120px (mode resize) ATAU `visualViewport.height` lebih pendek dari `innerHeight` >120px (mode overlay). Saat keyboard aktif, padding bawah komposer diganti `pb-2` (tanpa `env(safe-area-inset-bottom)`) sehingga tak ada pad berlebih di atas gesture bar; saat keyboard tertutup, kembali ke formula cap `pb-[max(0.5rem,min(env(...),1.25rem))]`.
- Skope hanya `ChatHubPage.jsx`; tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `4b8d82d`.

## Changelog — Chat: Fix Gap Bawah Saat Reply Preview + Auto-Scroll Setelah Kirim (8 September 2026)
- **Composer jadi satu unit `shrink-0`**: panel `ReplyPreview` dan form komposer dibungkus satu container `shrink-0` — footer chat menjadi satu flex-item sehingga saat reply preview (atau staging) terbuka, total tinggi footer tidak berubah dan `safe-area-inset-bottom`/padding bawah tetap konsisten (tidak muncul lagi ruang kosong/gap berlebih di bawah komposer).
- **Auto-scroll ke pesan terbaru setelah kirim**: `scrollToLatest()` kini dipanggil langsung di ketiga jalur kirim setelah `setMessages` — teks (`handleSend`), gambar (`handleSendImage`), dan lampiran ter-staging (`sendStagedFiles`) — baik setelah pesan optimistik `temp-*` ditambahkan maupun setelah swap id ke `data[0]` dari server. Sebelumnya setelah kirim, daftar pesan bisa tertahan di posisi lama (apalagi bila reply preview menambah tinggi area), sehingga pesan terkirim tidak langsung terlihat.
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `0e74233`.

## Changelog — Chat: Swipe-to-Reply di Mobile (8 September 2026)
- **Gestur geser ke kanan**: `MessageBubble` kini menangani `touchstart`/`touchmove`/`touchend` (+`touchcancel`). Bubble mengikuti jari via `translateX` (maks 96px), `touch-action: pan-y` di wrapper bubble supaya scroll vertikal daftar pesan tetap berjalan tapi geser horizontal ditangkap JS.
- **Umpan balik visual**: saat digeser, muncul badge bundar berikon `CornerUpLeft` (Balas) di sisi kiri bubble yang tersingkap bertahap (opacity sesuai rasio geser `swipeX / 56`); selama drag tanpa transisi (linear 40ms), saat lepas kembali animasi `cubic-bezier(0.22,1,0.36,1)` 300ms.
- **Eksekusi reply**: ambang `SWIPE_THRESHOLD = 56px` — saat lepas sentuhan dengan geser ≥ ambang, `handleReply(message)` dipanggil (state `replyTo` aktif, input fokus) persis seperti tombol "Reply", lalu bubble kempali ke posisi asal. Geser di bawah ambang / ke kiri tidak memicu apa-apa.
- Diaktifkan hanya bila ada `onReply` (disematkan ke `handleReply`). Hanya berlaku pada perangkat sentuh; desktop (mouse) tidak terpengaruh. Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `d275551`.

## Changelog — Fix: Jarak Bawah Berlebih pada Composer Mobile (8 September 2026)
- **Masalah**: area input teks/chat composer di perangkat mobile (mis. Samsung S24 FE) menyisakan ruang kosong terlalu jauh di bawah kotak input & tombol kirim, di atas navigation bar/gesture HP.
- **Penyebab**: `pb-[env(safe-area-inset-bottom)]` di form composer memakai nilai inset perangkat tanpa batas atas — pada beberapa WebView/browser Android inset laporannya besar sehingga padding tampak berlebihan.
- **Perbaikan**: padding bawah composer di-cap proporsional → `pb-[max(0.5rem,min(env(safe-area-inset-bottom),1.25rem))]` (selalu ≥ 8px, paling besar 20px) sehingga tetap aman terhadap gesture bar tapi tidak menimbulkan ruang kosong canggung; `pt-3` dikurangi jadi `pt-2` agar komposer lebih ringkas. `safe-area-inset-bottom` masih dipakai (bukan dihapus) supaya iOS/Android tetap adaptif.
- Murni CSS/Tailwind, satu baris class. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `7d332b3`.

## Changelog — Chat: Menu Aksi Pesan ala WhatsApp Web (8 September 2026)
- **Quick-action row hover dihapus**: deretan tombol aksi cepat desktop (Balas/Reaksi/Salin/Sematkan/Bookmark) yang muncul memenuhi bubble saat hover tidak ada lagi — digantikan **satu tombol `ChevronDown` kecil** di sudut kanan bawah bubble yang hanya tampil saat bubble di-hover/fokus (desktop `lg+`; mobile tetap pakai `MoreHorizontal` di meta-row yang sudah ada).
- **Popover melayang**: klik chevron → `openMessageMenu(msg, e)` menghitung posisi dari `getBoundingClientRect` tombol dan membuka *dropdown* `fixed` (w-60, z-[75], dekat sudut bubble): **baris emoji cepat** (6 emoji, klik = toggle reaksi langsung via `handleToggleReaction`) di bagian atas, lalu **menu vertikal** — Balas, Reaksi, Salin Teks, Sematkan/Lepas Sematan, Bookmark/Lepas, Hapus (sesuai fitur yang ada; Forward di-skip karena belum ada; Hapus & Bookmark hanya utk pesan sendiri; Reaksi + baris emoji disembunyikan utk HuniBot/pesan `temp-`).
- **Click-outside & auto-close**: backdrop penuh `fixed inset-0` (transparan di desktop) menutup menu saat klik di luar; memilih aksi juga menutup menu (`closeMenu`). Posisi di-clamp ke viewport (`max-h` + `overflow-y-auto` agar tidak terpotong layar kecil).
- **Reaksi via menu**: item "Reaksi" di popover meneruskan posisi popover sebagai `fallbackPos` ke `openReactionPicker` sehingga ReactionPicker melayang tepat di tempat menu dibuka (bukan tengah layar).
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `841a6de`.

## Changelog — Chat: Desain Pill Reaksi Gabungan ala WhatsApp (8 September 2026)
- **Satu kapsul, bukan pill terpisah**: `renderReactionsRow` — semua emoji aktif pada pesan kini digabung ke dalam satu *capsule pill* kecil di pojok kiri bawah bubble, tanpa lagi pill per-emoji yang renggang.
- **Emoji berdampingan + angka kumulatif**: ikon-ikon reaksi ditampilkan horizontal dalam kapsul (sedikit tumpang-tindih `-ml-1` agar berkesan stacked ala WhatsApp), diikuti **total angka** seluruh reaksi di sebelah kanan (`tabular-nums`). Saat aku ikut mereaksi, kapsul menyala dengan aksen `brand-accent` (border+bg) dan angka ikut berwarna aksen.
- **Detail ter-tab**: klik kapsul → bottom-sheet `ReactionSummary` kini punya **tab antar-emoji** (chip ikon + hitungan, scroll horizontal, aktif disorot aksen) sehingga semua jenis reaksi bisa dijelajahi; default buka ke emoji yang ku-reaksi (bila ada), jika reaksiku terhapus maka aktif berpindah otomatis ke emoji pertama yang tersisa (`effectiveEmoji`).
- **Toggle/remove mulus**: tombol "Hapus" reaksiku kini meneruskan **emoji tab yang aktif** (`onToggle(e)` → `handleToggleReaction(messageId, e)`), jadi menghapus tak mungkin salah target.
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `49a3e86`.

## Changelog — Chat: Lampiran ala WhatsApp — Staging/Preview Multi-File (7 September 2026)
- **Multi-file selection**: input gambar & dokumen kini `multiple` — user bisa pilih banyak file sekaligus dari dialog. Drag-drop juga menerima banyak file sekaligus.
- **Staging, bukan kirim-langsung**: file yang dipilih (gambar dari tombol +/gambar, dokumen PDF/DOC/XLS/PPT/TXT/CSV, atau drag-drop) tidak langsung diunggah. Semua masuk `stagedFiles` dan membuka **drawer pratinjau** di atas area input.
- **Fitur drawer pratinjau** (`fileStagingOpen`, z-[75]): daftar tiap file dengan thumbnail (pratinjau gambar) atau ikon dokumen, nama file, ukuran (`formatFileSize`) & tipe; tombol hapus per-file (`removeStagedFile`, me-revoke object URL); kolom **caption opsional**; tombol **Kirim** utama.
- **Kirim hanya setelah klik Kirim**: `sendStagedFiles` meng-upload tiap gambar ke bucket `CHAT_IMAGES` (via `uploadChatImage`/kompresi) & tiap dokumen ke `CHAT_FILES` (via `uploadChatFile`), lalu mengirim pesan chat (`direct_messages`) secara berurutan — caption dipakai sebagai `content` tiap pesan.
- **Integrasi komposer**: saat ada lampiran ter-staging, chip "N lampiran · Tinjau" muncul di atas textarea; tombol Kirim utama / Enter membuka drawer pratinjau (tidak langsung kirim); teks di input masih dipertahankan dan bisa dikirim setelah lampiran selesai ter-posting. `resetStaging()` dipanggil juga saat ganti kontak (bebaskan URL).
- **Housekeeping**: jalur lama `sendFileMessage` + state `fileUploading`/`setFileUploading` dihapus (tak lagi terpakai); modal pratinjau foto tunggal (`imagePreviewOpen`/`handleSendImage`) kini tak lagi dibuka oleh picker (unreachable, dipertahankan hanya untuk kompatibilitas kode lain).
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `f23be98`.

## Changelog — Chat: Reaksi Anti-Spam (1 Reaksi/Pengguna/Pesan) (7 September 2026)
- **Aturan baru**: setiap user maksimal **1 reaksi per pesan**. Klik emoji yang sama → toggle-off (unreact). Klik emoji berbeda → reaksi lama **diganti** emoji baru (state UI "others + emoji baru").
- **Celah spam yang ditutup**: sebelumnya emoji berbeda hanya di-insert tanpa mengganti reaksi lama (user bisa menumpuk banyak reaksi), dan dua klik cepat di tick yang sama bisa membaca `reactionsMapRef` yang belum ter-update → dua insert duplikat ke DB (tabel `message_reactions` **tanpa unique constraint** pada `(message_id, user_id)` — index hanya `message_id`).
- **Perbaikan di `handleToggleReaction`** (`ChatHubPage.jsx`):
  1. **Lock in-flight per pesan** (`reactionPendingRef` key `room:messageId`): klik masuk window proses DB di-<i>drop</i> — spam/rapid-click tidak pernah sampai ke database. Lock di-release di `finally`.
  2. **Semantik toggle/replace**: cek `wasActive` + `isSameEmoji` berbasis `reactionsMapRef` (frontend check sebelum insert); ketika aktif, DB di-`delete` SEMUA baris user untuk pesan tsb (juga membersihkan duplikat legacy) lalu `insert` emoji baru bila perlu — self-healing.
  3. **Rollback + toast** dipertahankan (restore `prevList` bila gagal, guard room sama). Dijalankan lewat async IIFE `try/catch/finally`.
- Catatan hardening lapis-DB (opsional, tidak diimplementasikan di commit ini): tambahkan unique constraint `(message_id, user_id)` setelah dedup data legacy via migration.
- Murni frontend. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `bd4b2fa`.

## Changelog — Chat: UX Desktop — Sembunyikan Emoji Mengambang & Reaksi via Quick-Action (7 September 2026)
- **Tombol emoji 😊 mengambang kini mobile-only**: di `lg` ke atas tombol di pojok bubble tidak lagi dirender (kelas `lg:hidden` + `lg:group-hover/message:hidden` + `lg:group-focus-within/message:hidden` agar `display:none` menang atas hover-variant `group-hover/message:flex` di setiap kondisi). Estetika/legibilitas bubble desktop bersih; di mobile tetap tersedia (tap/focus bubble + menu ⋯).
- **Desktop tetap bisa reaksi via quick-action hover row**: tombol **Reaksi** (ikon `Smile`, teks "Reaksi") ditambahkan setelah "Balas" di baris aksi cepat bawah bubble — membuka `ReactionPicker` via `click` (bukan hover, agar picker tidak menimpa tombol lain saat kursor lewat). Sama seperti menu ⋯: sembunyi untuk room HuniBot & pesan `temp-*`. Urutan kini Balas → Reaksi → Salin → Sematkan → Bookmark (paritas dengan menu mobile).
- **Baris quick-action tidak lagi jadi hot-zone tersembunyi**: row kini `pointer-events-none` saat tersembunyi, dan `group-hover/message:pointer-events-auto`/`group-focus-within/message:pointer-events-auto` saat tampil — klik di ruang kosong bawah bubble (opacity-0) tidak lagi memicu aksi; keyboard tetap bisa tab ke tombol (pointer-events tidak memengaruhi fokus).
- Murni frontend. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `46b56d0`.

## Changelog — Chat: Hardening Fitur Reaksi (A–E) + UX (7 September 2026)
- **A — Reaksi pertama kini tampil live (bug realtime)**: `fetchReactionsFor` sebelumnya hanya membuat key `roomMap[message_id]` untuk pesan yang *sudah* punya reaksi, sedangkan handler INSERT/DELETE realtime menolak pesan tanpa key → reaksi pertama dari lawan bicara tak dirender sampai ganti room/reload. Kini `fetchReactionsFor` menginisialisasi `[]` untuk **semua** messageId yang dimuat (termasuk saat data kosong), dan handler INSERT/DELETE memvalidasi via `messagesIdSetRef` (Set id pesan aktif, ref mirror) — bukan keberadaan key — sehingga reaksi pertama append/remove langsung. Set-id mencegah reaksi dari room lain mencemari map room aktif.
- **B — Tombol emoji disembunyikan di room HuniBot**: `onOpenReactionPicker` di-pass `null` saat `activeContactId === HUNIBOT_ID` (sebelumnya tombol 😊 tetap dirender walau `openReactionPicker` no-op).
- **C — Item "Reaksi" di menu ⋯ (mobile)**: menu bottom-sheet kini punya "Reaksi" (ikon `Smile`) setelah "Balas" — jalur reaksi mobile yang setara desktop. Sembunyi untuk room HuniBot & pesan `temp-*`.
- **D — Rollback + toast saat simpan/hapus reaksi gagal**: handleToggleReaction kini memeriksa `{ error }` dari insert/delete; bila gagal, entri optimistik di-rollback di `reactionsMap` + toast error. Rollback hanya diterapkan bila masih di room yang sama (`activeContactIdRef` guard), mencegah mencemari room lain. Deps `[userId, showToast]` aman karena `showToast` dari AuthContext di-`useCallback`.
- **E — Guard reaksi pesan `temp-*`**: `handleToggleReaction` menolak `messageId` berawalan `temp-` (pesan optimistik belum diswap ke UUID → insert pasti gagal FK), dan `openReactionPicker` memberi toast "Tunggu pesan terkirim sebelum memberi reaksi." sebagai feedback (bukan no-op senyap).
- **UX**: ReactionPicker mendukung navigasi ArrowLeft/Right antar emoji + fokus ke tombol pertama saat terbuka (Esc tetap tutup); urutan pill reaksi kini stabil mengikuti urutan `REACTION_EMOJIS` (ekstra di akhir); `ReactionSummary` membaca reaksi **live** dari `reactionsMap` (bukan snapshot) dan baris "Kamu" punya tombol "Hapus" reaksiku (reuse `handleToggleReaction`).
- Murni frontend. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `1e7ba4c`.

## Changelog — Chat: Fix Overlap Tombol Reaksi & Reaksi Picker Tidak Berfungsi (7 September 2026)
- **Bug A — tombol emoji 😊 menindih tombol aksi**: di mobile tombol 😊 (`absolute bottom-2 right-2`) menimpa tombol `⋯` (MoreHorizontal di pojok kanan-bawah bubble) untuk pesan pendek; di desktop posisinya menempel di atas baris aksi cepat (Balas/Salin/Sematkan/Bookmark). → Dipindah ke pojok **kanan-atas dalam bubble** (`top-2 right-9`): bersih dari `⋯` (bawah), baris quick-action (di bawah bubble), tombol hapus (di luar bubble atas), dan bintang bookmark (`right-2`). `right-9` memberi jarak aman dari bintang bookmark (`right-2`).
- **Bug B — klik emoji di ReactionPicker tidak menghasilkan reaksi**: root cause ada di **pemanggil**, bukan di picker. Call site `onPick={handleToggleReaction}` memanggil `handleToggleReaction(messageId, emoji)` dengan **satu argumen** (emoji saja, dari `onPick?.(emoji)`), akibatnya `messageId` terisi string emoji dan `emoji` = `undefined` → pencarian reaksi selalu kosong dan query DB no-op. → Call site kini `onPick={(emoji) => handleToggleReaction(reactionPickerMsg?.id, emoji)}`; guard defensif `!userId || !messageId || !emoji` ditambahkan di `handleToggleReaction`; tombol emoji di picker juga diberi `e.stopPropagation()` (selain container yang sudah ada). Jalur `onReact` dari pill reaksi aman karena `onShowSummary` selalu tersedia di call site.
- Murni frontend. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `38065cc`.

## Changelog — Chat: UX — Quick-Action Keyboard, Konsistensi Status Online/Last-Seen, Hint Empty State (7 September 2026)
- **Aksesibilitas quick-action**: tombol reaksi (😊) dan baris aksi cepat (Balas/Salin/Sematkan/Bookmark) kini tampil tidak hanya saat `group-hover/message` tapi juga `group-focus-within/message` — pengguna keyboard yang men-tab ke dalam bubble melihat tombolnya, tidak lagi "invisible" (`ChatHubPage.jsx` di wrapper bubble).
- **Konsistensi status online/last-seen**: daftar kontak kini menampilkan chip `● Online` (tulisan hijau + dot, identik dengan header ruang chat) untuk kontak non-HuniBot yang sedang online; fallback "Terakhir aktif …" memakai penulisan yang sama dengan header. HuniBot tetap memakai chip role "AI Assistant".
- **Hint empty state**: `EmptyChat` (saat membuka percakapan tanpa riwayat) menampilkan satu baris tip — kirim gambar (drag & drop / tombol +), lampirkan dokumen, dan bagikan kartu properti.
- Murni frontend. Commit: `5f3b5e7`.

## Changelog — Fix: Crash ChatHubPage "Terjadi Kesalahan" (Temporal Dead Zone `handleSelectContact`) (7 September 2026)
- **Gejala**: setiap buka `/chat`, halaman langsung crash → ditangkap ErrorBoundary global (App) → "Terjadi Kesalahan". Terjadi pada build produksi & dev.
- **Root cause**: `handleSelectContact` dideklarasikan di baris ~1791 (sebagai `const handleSelectContact = useCallback(...)`), tetapi direferensikan di **deps array** sebuah `useEffect` deep-link `openUserId` yang posisinya **lebih atas** (~baris 1215). Saat render, deps array dievaluasi lebih dulu dari deklarasi `const` → `ReferenceError: Cannot access 'handleSelectContact' before initialization` (temporal dead zone). Ditimbulkan oleh optimasi `1de9ef4` yang menambahkan `handleSelectContact` ke deps effect tsb tanpa memindahkan deklarasinya ke atas.
- **Perbaikan**: deklarasi `handleSelectContact` dipindah ke atas, tepat sebelum effect deep-link auto-select (`openUserId`). Karena `useCallback` itu ber-deps `[]` (body hanya memakai setter + ref milik sendiri), pemindahan aman tanpa mengubah perilaku. Dua pemanggilan sinkron di body effect diberi `// eslint-disable-next-line react-hooks/set-state-in-effect` sesuai konvensi file. Tidak ada perubahan perilaku deep-link `?user=...`.
- **Verifikasi**: di-reproduksi dengan sesi fiktif di headless browser — sebelum fix muncul "Terjadi Kesalahan" + `ReferenceError`; setelah fix halaman `/chat` mount normal (daftar kontak + HuniBot + "Pilih kontak untuk memulai obrolan"). `eslint` bersih, `vite build` sukses. Commit: `b93e67f`.

## Changelog — Chat: Tutup Risiko #5 (Lookup nama reaksi stabil) & #8 (Clipboard modern) (7 September 2026)
- **Risiko #5 — stabilkan lookup `messageNamesMap`**: `handleShowReactionSummary` sebelumnya ber-depen `[userId, messageNamesMap]` → setiap kali nama reaksi dimuat, identitas callback berubah dan (karena prop `onShowSummary` di-pass ke tiap bubble) seluruh `MessageBubble` ikut re-render. Kini `messageNamesMap` dibaca via ref mirror `messageNamesMapRef` (di-assign tiap render) sehingga callback stabil (`deps: [userId]`). Lookup nama tetap O(1) (object keyed by user id) dan user yang sudah dikenal dilewati dari query `profiles`.
- **Risiko #8 — clipboard modern**: `handleCopyMessage` kini selalu menyalin `text` hasil perhitungan (trim content / nama file bila lampiran), bukan `msg.content` mentah. Jalur primer `await navigator.clipboard.writeText(text)`; bila di-blokir, fallback legacy (`textarea` + `execCommand('copy')`) memverifikasi nilai kembalian boolean execCommand (bukan asumsi sukses), dengan `readonly`, `setSelectionRange`, dan pembersihan textarea di `finally`. Toast sukses/gagal kini akurat sesuai hasil nyata.
- Murni frontend, tanpa migration/DB. Lint bersih (`eslint`) + build sukses (`vite`). Commit: `512e8e0`.

## Changelog — Chat: Gabungkan Channel Presence + Error Boundary + Verifikasi RLS (7 September 2026)
- **Penggabungan channel presence ganda (risiko #3)**: effect `app-online` dihapus dari `ChatHubPage.jsx`; `chat-presence-track` (yang juga memuat timer `last_seen_at` 60s) kini menjadi satu-satunya channel presence dan key-nya diperkaya menjadi `track({ userId, online_at: ... })`. `setOnlineIds` tetap identik. Menghemat 1 koneksi Supabase realtime per client dan menghilangkan payload presence duplikat. Aman saat rollout karena semua client lama/baru sudah sama-sama subscribe `chat-presence-track`.
- **Error Boundary (risiko #4, sebagian)**: `ChatErrorBoundary` (class component ringan, reuse ikon `AlertTriangle`/`RefreshCw`) membungkus dua lapis — tiap render bubble pesan (daftar `messages.map`) dan kartu `PropertyMessage` di dalam bubble. Bila satu pesan/kartu properti throw saat render, hanya blok tersebut yang menampilkan fallback "Muat ulang", seluruh halaman chat tetap berfungsi.
- **Verifikasi RLS (risiko #7)**: pengecekan migration menegaskan `message_reactions` sudah participant-only (SELECT/INSERT) + owner-only (DELETE), dan bucket `CHAT_IMAGES` sudah ter-hardening (public, 5MB, whitelist MIME, folder milik sendiri). **Tidak ada migration baru** yang diperlukan.
- Murni frontend + verifikasi RLS (tanpa perubahan DB). Commit: `c8fae65`.

## Changelog — Chat: Optimasi Performa (memo/useCallback/useMemo) & Pembersihan Memori (7 September 2026)
- **Prevent jank re-render** (`ChatHubPage.jsx`): `MessageBubble`, `ContactItem`, `DateSeparator`, `TypingDots` dibungkus `React.memo`; handler yang dioper ke `MessageBubble`/`ContactItem` di-stabilkan via `useCallback` (`handleReply`, `handleJumpToMessage`, `handleTogglePin`, `handleToggleReaction`, `handleShowReactionSummary`, `handleToggleStar`, `openReactionPicker`, `handleCopyMessage`, `handleOpenFile`, `handleSelectContact`, `starCountFor`). Callback membaca state terkini lewat ref mirror baru (`reactionsMapRef`, `pinnedMessagesRef`, `starredMessagesRef` — di-assign tiap render) agar `useCallback` ber-depen minimal & bebas stale closure. Prop `reactions` pada bubble tanpa reaksi memakai konstanta `EMPTY_ARRAY` (referensi stabil, bukan array literal baru tiap render).
- **Kalkulasi berat di-`useMemo`**: `searchMatches`, `replyIndex` (Map pesan by id → lookup reply **O(1)**, menghilangkan O(n²) `.find` sebelumnya), `filteredContacts`, `visibleContacts`, dan `starCountFor` (dibuat `useCallback`). Hasilnya: hover reaksi/ketik draft tidak lagi me-render ulang seluruh daftar bubble.
- **Pembersihan memori antar room**: effect `[activeContactId, userId, messagesRetryCounter]` kini me-reset `reactionsMap` & `pinnedMessages` saat berpindah ke room berbeda (deteksi via `lastCleanupRoomRef`) — mencegah penumpukan cache per room selama sesi; data di-fetch ulang otomatis saat room dibuka (draf pengguna sengaja TIDAK dihapus — fitur persist).
- **Murni frontend**, tanpa migration/DB. Commit: `1de9ef4`.

## Changelog — Chat: Perbaikan Total Positioning & Lifecycle ReactionPicker (7 September 2026)
- **Gejala bug (berulang 2x)**: picker emoji 😊 tidak muncul di dekat bubble — v1 "terbang" ke pojok kanan-atas (menimpa Top Navbar), maka diganti `position: fixed`; setelah itu v2 malah nyangkut di pojok kiri-atas (area daftar kontak). Keduanya menandakan kalkulasi koordinat selalu jatuh ke angka seragam, bukan mengikuti elemen ikon.
- **Akar masalah sebenarnya**: pada **dua iterasi sebelumnya** handler tombol emoji tidak meneruskan event — `onMouseEnter={() => onOpenReactionPicker?.(message)}` (tanpa `e`) → `e?.currentTarget` selalu `undefined` → `getBoundingClientRect()` **tak pernah sempat dibaca** → fallback koordinat tetap terpakai (`{top:40,right:12}` = kanan-atas; `{top:40,left:12}` = kiri-atas). Bukan masalah CSS positioning.
- **Perbaikan end-to-end** (`ChatHubPage.jsx`):
  1. **Event diteruskan**: `onMouseEnter/onClick={(e) => onOpenReactionPicker?.(message, e)}` → rect dibaca **langsung dari tombol emoji** via `e.currentTarget.getBoundingClientRect()`.
  2. **Fallback koordinat aman**: rect divalidasi (`Number.isFinite` + dalam rentang viewport); bila gagal/`null` → picker dirender **di tengah layar** (bukan `0,0`).
  3. **Desktop**: `position: fixed` + `top: rect.top - PICKER_H - 10` (muncul di atas ikon) & `left: rect.left - 20` (di-clamp `8..vw-PICKER_W-8`) → konsisten untuk pesan pengirim (kanan) maupun penerima (kiri), `z-[60]` (di atas Navbar `z-50`).
  4. **Mobile** (`vw < 768`): diposisikan **fixed bottom-center** (di atas safe-area via `visualViewport.offsetTop`) agar tidak terpotong viewport sempit.
  5. **Lifecycle & state terisolasi per pesan**: picker ditutup otomatis ketika — **Esc**, **klik/tap di luar** (`mousedown`/`touchstart` + `pickerRef.contains`), **setelah memilih emoji** (`handleToggleReaction`), **ganti kontak** (`handleSelectContact`), dan saat **scroll daftar pesan** (`handleMessagesScroll`). Posisi disimpan di `reactionPickerPos` & dibaca ulang setiap render.
- **Murni frontend**, tanpa migration/DB. Iterasi lama (commit `5f8de2f`/`52d1160`) digantikan; pendekatan final: commit `a438d3f`.

## Changelog — Chat: Perbaikan Positioning ReactionPicker (7 September 2026)
Iterasi awal yang telah digantikan oleh pendekatan "Perbaikan Total" di atas (riwayat).

## Changelog — Chat: Layout Responsif Optimasi Desktop Layar Lebar (7 September 2026)
- **Container chat lebih luas**: distribusi panel kini memakai ruang layar besar secara maksimal — lebar kawasan chat naik dari cap `lg:max-w-7xl` (1280px) menjadi **`2xl:max-w-[1600px]`** di viewport ≥1536px, sehingga margin kosong di kiri/kanan berkurang drastis di monitor lebar/ultra-wide (`ChatHubPage.jsx`).
- **Panel kontak lebih lega**: `lg:w-80` (320px) → **`xl:w-96` (384px)** — avatar, nama, preview pesan, chip unread & bookmark star punya ruang lebih sehingga tidak terpotong di desktop.
- **Bubble pesan lebih lebar di layar besar**: batas `lg:max-w-[65%]` dinaikkan ke **`xl:max-w-[70%]`** — pesan teks & lampiran media memanfaatkan area chat yang lebih luas tanpa menyempit secara proporsional.
- **Murni frontend**, tanpa migration/DB. Commit: `2205ec2`.

## Changelog — Chat: Bookmark (Star), Ringkasan & Picker Reaksi, Drag-Drop Gambar, Sound/Notifikasi, Last Seen, Error State (7 September 2026)
- **Bookmark/star pesan** (`ChatHubPage.jsx`, migration `20260907_chat_starred_messages.sql`): tabel baru `chat_stars` (`id`, `user_id` FK→auth.users cascade, `chat_id` text = room `[a,b].sort().join('-')`, `message_id` FK→direct_messages cascade, `created_at`, unique `(user_id, message_id)`, RLS owner-only + index `(user_id, chat_id)`). Star hanya untuk **pesan kiriman sendiri** (`msg.sender_id === userId`); toggle lewat ikon ⭐ di hover bubble, menu aksi **Bookmark/Lepas Bookmark**, badge bintang amber di bubble + toast; stars di-load dikelompokkan per room (`select message_id, chat_id`) agar bookmark lintas percakapan akurat.
- **Ringkasan reaksi + reaction picker**: klik badge reaksi → bottom sheet `ReactionSummary` (daftar pengguna per emoji via `messageNamesMap`, "Kamu" diurutkan pertama); hover/tap 😊 di bubble → `ReactionPicker` (6 emoji `REACTION_EMOJIS`: 👍❤️😂😮😢🔥) dengan posisi mengikuti elemen, tutup via Esc. Di-guard untuk room HuniBot.
- **Drag & drop gambar**: drag file gambar (JPG/PNG/WEBP/AVIF, maks 5MB) ke area chat → overlay **"Lepaskan untuk mengirim gambar"** → langsung membuka `ImagePreviewModal` dengan caption. Validasi MIME/ukuran via toast error; guard `activeContactId === HUNIBOT_ID`.
- **Pengaturan chat: sound & notifikasi** (`SETTINGS_KEY='hunione-chat-settings'` persist di localStorage): tombol `Volume2` dan `Bell` di header percakapan (aktif/nonaktif). Pesan masuk saat tab tak fokus → **suara beep (Web Audio)** bila `sound` aktif dan **Web Notification** bila `notifications` aktif (+ request permission saat diaktifkan); logika memakai `chatSettingsRef` agar handler realtime selalu membaca nilai terbaru.
- **Last seen (`profiles.last_seen_at`)**: efek memuat `last_seen_at` semua kontak + subscribe realtime UPDATE `profiles`; kontak offline menampilkan **"Terakhir aktif X"** di daftar kontak & header percakapan. Presence channel rutin meng-update `last_seen_at` tiap 60 detik saat tab visible.
- **Empty/error state + retry**: daftar kontak & riwayat pesan kini punya state error (icon) dengan tombol **"Coba lagi"** (`contactsRetryCounter`/`messagesRetryCounter` memicu ulang fetch); spinner & loading skeleton tetap.
- **MessageBubble desktop action-bar**: tindakan hover **Reply / Copy / Pin / Bookmark** dengan ikon kecil; keyboard Esc global menutup semua overlay (menu pesan, reaction, summary, preview gambar, cari, modal hapus).
- **Murni frontend + 1 migration**: `ChatHubPage.jsx`; migration `20260907_chat_starred_messages.sql` wajib dijalankan di SQL Editor Supabase. Commit: `a7fd344`.

## Changelog — Chat: Pembatas "Pesan Baru", Filter Kontak Bookmark, dan Lampiran File PDF/Dokumen (7 September 2026)
- **Pembatas "Pesan Baru" (unread divider)**: saat chat dibuka, posisi **pesan masuk pertama yang belum dibaca** ditangkap di `markRead` (sebelum `read_at` diisi) → garis pemisah "● Pesan Baru" dirender tepat di atas pesan pertama yang belum dibaca. Divider hilang otomatis saat scroll ke bawah (`handleMessagesScroll`/`scrollToBottom`) atau mengirim balasan, dan di-reset per kontak agar unread baru di sesi berikutnya tetap terdeteksi. **Murni frontend**, tanpa migration.
- **Filter kontak Bookmark (star view)**: tab **"Bookmark"** baru di chip filter daftar kontak (ikon ⭐ kuning + jumlah kontak ber-star) → hanya menampilkan kontak yang punya pesan dibookmark (`starCountFor(c)` lewat room `[userId,c.id].sort().join('-')`). Kontak menampilkan **chip `⭐ N`** saat punya star; empty state khusus "Belum ada pesan dibookmark". Melengkapi fitur star (bookmark kini dapat ditelusuri lintas percakapan).
- **Lampiran file PDF/dokumen** (`ChatHubPage.jsx`, migration `20260907_chat_file_attachments.sql`):
  - Kolom baru `direct_messages`: `file_url`, `file_name`, `file_size`, `file_type`.
  - Bucket storage **`CHAT_FILES`** (public, maks 20MB, whitelist PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV; policy upload/update/delete hanya folder `{auth.uid()}` — pola sama seperti `CHAT_IMAGES`).
  - Menu plus (+) → **"Kirim dokumen"** → input file (`accept=".pdf,.doc,.docx,..."`) → upload `CHAT_FILES/{userId}/...` → kirim optimistik (realtime INSERT tetap skip pesan sendiri via `sender_id === userId`). Tombol kirim menampilkan spinner saat `fileUploading`.
  - **Bubble file**: kartu lampiran berisi **ikon per jenis** (PDF merah, DOC biru, XLS hijau, PPT oranye, arsip ungu, umum abu — helper `getFileIcon`) + nama + ukuran (`formatFileSize`) + tombol buka/unduh (`handleOpenFile` → `window.open` URL publik).
  - Integrasi penuh: preview balasan (`ReplySnippet`) & sematan menampilkan nama file, copy pesan file menyalin nama file, export CSV menulis `[Dokumen]`, `MessageBubble` menerima prop baru `onFileOpen`.
- Migration `20260907_chat_file_attachments.sql` wajib dijalankan di SQL Editor Supabase sebelum fitur aktif. Commit: `d1fbb9d`.

## Changelog — Perbaikan Realtime Chat #2: Hapus Filter `or(...)` pada `postgres_changes` (31 Agustus 2026)
- **Akar masalah baru**: selain masalah resubscribe (sudah diperbaiki sebelumnya), koneksi realtime masih gagal menangkap pesan karena `postgres_changes` tidak mendukung operator `or(...)` pada parameter `filter` (`filter: or(sender_id.eq...,receiver_id.eq...)`) → subscription diam-diam gagal menerima payload.
- **Hapus parameter `filter`** (`ChatHubPage.jsx`): kedua handler `postgres_changes` (event `INSERT` dan `UPDATE`) pada tabel `direct_messages` kini **tanpa filter**, sehingga client menerima semua event yang diizinkan RLS.
- **Guard client-side (RLS double-check)**: di dalam callback dilakukan pengecekan manual `if (msg.sender_id !== userId && msg.receiver_id !== userId) return` sebagai pengaman ganda selain RLS. Untuk INSERT tetap ada guard `sender_id === userId` (cegah duplikat echo pesan optimistik).
- **Konsekuensi**: subscription realtime sekarang benar-benar menyala (status `SUBSCRIBED` via callback), pesan masuk diinjeksi real-time tanpa refresh.
- **Murni frontend** — tidak ada perubahan database. Commit: `35deea3`.

## Changelog — Perbaikan Realtime Chat `direct_messages` di ChatHubPage (31 Agustus 2026)
- **Akar masalah**: channel realtime `direct_messages` sebelumnya dibuat ulang setiap `activeContactId` berubah (deps `[userId, activeContactId, showToast]`), dan handler memakai closure `activeContactId` yang basi → pesan masuk sering terlewat dan butuh refresh browser.
- **Single persistent channel** (`ChatHubPage.jsx`): channel Supabase kini hanya bergantung pada `[userId, showToast]` (keduanya stabil), jadi tidak di-teardown saat ganti kontak. Kontak aktif saat ini dibaca via ref `activeContactIdRef` (selalu terbaru) sehingga handler tetap benar tanpa harus resubscribe.
- **Injeksi langsung tanpa reload**: event `INSERT` langsung menambahkan pesan baru ke state `messages` jika `otherId === activeContactIdRef.current` (dengan guard duplikat `prev.some(m => m.id === msg.id)`), tanpa fetch ulang.
- **Sidebar kontak dinamis**: pesan masuk selalu menaikkan kontak ke urutan paling atas, memperbarui `last_message`/`last_message_at` (preview), dan menambah `unreadMap[otherId]` bila bukan chat yang sedang dibuka (badge unread naik). Bila kontak belum ada, dibuat baru dari `profiles`.
- **Auto-scroll & HuniBot guard**: bila pesan untuk room aktif dan posisi sudah di bawah (`isAtBottomRef`), dipanggil `scrollToLatestRef.current()`; bila tidak di bawah, muncul FAB "pesan baru". Chat HuniBot (virtual, bukan `direct_messages`) di-guard dengan `otherId === HUNIBOT_ID` agar tidak tertimpa.
- **Anti-duplikat**: guard `sender_id === userId` mencegah race duplikat antara pesan optimistik (id `temp-*`) dan echo INSERT milik sendiri. Event `UPDATE` tetap menangani `read_at`/`deleted_at`.
- **Cleanup**: cleanup `return () => { realtimeCancelledRef.current = true; supabase.removeChannel(channel) }` memastikan channel berhenti dan tidak ada memory leak/pembaruan ganda.
- **Murni frontend** — tidak ada perubahan database.

## Changelog — Chart "Tren Tayangan" Per Hari di Dashboard (31 Agustus 2026)
- **Chart tren tayangan** (`DashboardPage.jsx`): tab **Ringkasan Performa** kini menampilkan **AreaChart recharts** "Tren Tayangan" — tayangan harian agregat semua listing kamu selama periode terpilih (7/14/30 hari).
- **Sumber data**: `loadSellerData` menambah state `viewTrend` = deret harian yang digabung dari `property_views.viewed_on`. Helper `buildViewTrend(views, maxDays)` meng-agregasi tayangan per tanggal dan mengisi hari tanpa tayangan dengan `0` agar grafik kontinu.
- **Pemilih rentang**: tombol toggle **7H / 14H / 30H** di header kartu chart (state `trendDays`, default 7); `chartData` di-slice dari deret menaik via `useMemo`.
- **Styling konsisten**: memakai variabel brand (`--color-brand-accent/border/muted`) dengan gradient area (`viewGrad`) + **custom Tooltip** (kartu berisi hari penuh + jumlah tayangan). Menampilkan empty-state "Belum ada tayangan dalam periode ini" bila tidak ada data.
- **Mobile-friendly**: kontainer chart `w-full h-56`, XAxis `minTickGap={28}` + `tickMargin={8}` agar label tanggal tidak saling tumpang-tindih di layar sempit (terutama rentang 30H). Diverifikasi lebar kartu tidak meluber horizontal pada viewport 375px.
- **Murni frontend** — tidak ada perubahan database (data sudah tersedia dari property_views).

## Changelog — Dashboard Seller/Agen Optimasi Mobile (31 Agustus 2026)
- **Tab bar sticky & mobile-friendly** (`DashboardPage.jsx`): tombol tab kini `flex-wrap` dengan `flex-1 sm:flex-none` (terbagi rata penuh di layar sempit), ditambah sticky `top-14` (tepat di bawah TopNavbar yang `fixed top-0`) dengan `bg-brand-surface/95 backdrop-blur` + bottom border, agar tab selalu terlihat saat scroll. Label dipendekkan jadi "Ringkasan" / "Kelola Iklan".
- **Grid statistik responsif**: kartu stat kini `p-3 sm:p-4`, label/sub `truncate`, dan kartu terakhir ("Terjual") diberi `col-span-2 lg:col-span-1` sehingga tidak menggantung sendiri di baris ketiga grid 2 kolom pada mobile. Label dipersingkat (Tayangan/Leads/Konversi/Kunjungan/Terjual).
- **Filter status** (Semua/Aktif/Terjual): `flex-wrap` + `flex-1` agar terbagi rata dan tidak meluber di lebar ≤360px.
- **Aksi Iklan (Edit / Tandai Terjual)**: pada mobile kini `flex-col` full-width `text-center` dengan `py-2` (target sentuh lebih besar); di `sm:` kembali baris sempit. Tombol tidak lagi berdesakan dengan badge status.
- **Murni frontend** — tidak ada perubahan database.

## Changelog — Dashboard Seller/Agen Profesional: Statistik Per-Properti, Konversi, Filter & Tab (31 Agustus 2026)
- **Statistik per-properti (#2)** (`DashboardPage.jsx`): `loadSellerData` kini men-query `property_views` & `whatsapp_leads` dengan `property_id` dan membangun peta `propertyStats { [propertyId]: { views, leads } }` (state baru). Setiap baris "Iklan Saya" menampilkan badge **"X tayangan · Y lead"** (views = jumlah tayangan properti itu; leads = buyer unik per properti dari whatsapp_leads).
- **Tingkat konversi (#3)**: kartu statistik baru **"Konversi"** (persentase `Total Leads / Total Tayangan`) ditambahkan ke grid Ringkasan Performa — kini 5 kartu: Tayangan, Leads, **Konversi**, Jadwal Kunjungan, Terjual (grid `lg:grid-cols-5`).
- **Filter & pencarian listing (#7)**: di tab **Kelola Iklan**, ditambahkan **search bar** (cari judul properti) + **filter status** (Semua / Aktif / Terjual). Hasil empty-state khusus "Tidak ada iklan yang cocok" bila pencarian/filter kosong.
- **Tata letak berbasis tab (#8)**: tampilan seller dipisah jadi **tab "Ringkasan Performa"** (grid statistik 5 metrik + daftar **"Listing Paling Aktif"** — 3 properti non-sold teratas urut views, dengan badge views/leads — + kotak tips) dan **tab "Kelola Iklan"** (search + filter + daftar lengkap dengan Edit & Tandai Terjual + CTA iklankan baru), agar halaman tidak terlalu panjang.
- **Murni frontend** — data sudah tersedia (property_views, whatsapp_leads, direct_messages, site_visits); tidak ada perubahan database.

## Changelog — Hybrid Dashboard (Deteksi Listing Aktif) + Integrasi Iklan Saya (31 Agustus 2026)
- **Hybrid mode berbasis listing, bukan role** (`DashboardPage.jsx`): penentuan tampilan kini memakai pengecekan **apakah user punya listing di `properties`** (`select head count where seller_id = user.id`), bukan `role` di `profiles`. Jika punya **≥1 listing** → **Seller/Agent Dashboard** (views, leads, kunjungan, terjual, daftar iklan + Tandai Terjual) untuk **siapa pun**, termasuk akun ber-role `pembeli` yang sudah mengiklankan; jika **belum pernah mengiklankan** → Buyer Dashboard standar. Konstanta `SELLER_ROLES` & variabel `isSeller` dihapus; state `mode` ('seller'|'buyer') dipakai.
- **Integrasi "Iklan Saya" ke dalam dashboard** (`DashboardPage.jsx`): bagian "Iklan Saya" (eks "Ringkasan Listing") kini menampilkan **semua** listing (bukan 5 teratas) lengkap dengan badge status (Aktif/Menunggu/Terjual), tombol **Edit** (→ `/sell?edit=:id`) dan **"Tandai Terjual"** (modal atribusi internal/eksternal), plus CTA **"Iklankan properti baru"**. Tidak perlu terlempar ke `/my-listings` hanya untuk melihat status iklan; link "Kelola lengkap" ke `/my-listings` tetap ada untuk fitur lanjutan (leads/jadwal kunjungan).
- **Murni frontend** — tidak ada perubahan database; aman di-commit & push.

## Changelog — Buka Akses Dashboard untuk Semua User Login (31 Agustus 2026)
- **TopNavbar** (`TopNavbar.jsx`): tombol **"Dashboard"** (ikon grid) kini tampil untuk **semua user yang login** → navigasi ke `/dashboard` (sebelumnya hanya admin → `/admin`). Untuk admin tetap ada tombol terpisah **"Admin"** → `/admin`.
- **HamburgerMenu** (`HamburgerMenu.jsx`): item menu **"Dashboard"** (`hamburger.dashboard`) ditambahkan untuk semua user login di Menu Utama → `/dashboard` (state `dashboardActive` menandai rute aktif). Item admin tetap ada, labelnya diubah jadi **"Dashboard Admin"** (`hamburger.admin`).
- **ProfileDrawer** (`ProfileDrawer.jsx`): item **"Dashboard"** → `/dashboard` ditambahkan untuk semua user login (ikon `LayoutDashboard`), di samping "Dashboard Admin" (tetap khusus admin).
- **i18n** (id/en `translation.json`): key baru `hamburger.dashboard` = "Dashboard"; nilai `hamburger.admin` diubah dari "Dashboard" → "Dashboard Admin" untuk membedakan user dashboard vs admin dashboard.
- **DashboardPage** (`/dashboard`): sudah mendukung **Buyer Mode** untuk role `pembeli` (saran yang mulus, tanpa error) — karena policy RLS properties insert role-agnostik, akun pembeli juga bisa mengiklankan dan melihat ringkasan aktivitasnya di dashboard.
- **Murni frontend** — tidak ada perubahan database; aman di-commit & push.


## Changelog — Perbaikan Submit Listing yang "Mengirim..." Stuck/Lama di SellPropertyPage (31 Agustus 2026)
- **Analisis penyebab stuck**: tombol Kirim (state `submitting`) sebelumnya bisa menggantung tanpa feedback. Akar masalah: fase upload gambar memakai `Promise.all` paralel **tanpa timeout** — bila kompresi (`browser-image-compression`) atau upload storage (`PROPERTIES_IMAGE`) lambat/macet di jaringan, promise menunggu selamanya dan tombol tetap "Mengirim...". RLS **bukan penyebab**: policy `properties` insert (`with check auth.uid() = seller_id`, migration `20260730_properties_rls_policies.sql`) bersifat role-agnostik, jadi akun `pembeli` tetap boleh membuat listing selama `seller_id = user.id` (sudah diisi kode).
- **Progress transparan** (`SellPropertyPage.jsx`): state baru `statusText` → teks status beranimasi di bawah tombol: "Memeriksa akun...", "Mengompresi gambar X dari Y...", "Mengunggah foto X dari Y...", "Menyimpan data properti...". Upload diubah dari paralel `Promise.all` menjadi **sekuensial** agar progres terlihat dan akurat.
- **Timeout anti-hang** (`SellPropertyPage.jsx`): helper `withTimeout(promise, ms, message)` di-warp pada kompresi & tiap upload (45 detik, `UPLOAD_TIMEOUT_MS`) → jika lewat batas, throw error yang jelas ("memakan waktu terlalu lama...") dan masuk ke handle error.
- **Error feedback komprehensif**: semua jalur gagal kini `setSubmitting(false)` + `setStatusText('')` + `showToast` dengan pesan spesifik (gagal kompresi/upload/database/RLS). Error DB (`queryError`) juga menampilkan `queryError.message` via toast, bukan gagal senyap.
- **Murni frontend** — tidak ada perubahan database; aman di-commit & push.


## Changelog — User Dashboard Peran (Buyer & Seller/Agen) + Analytics & Atribusi Terjual (31 Agustus 2026)
- **Route baru `/dashboard`** (`App.jsx` + `DashboardPage.jsx` baru): halaman **User Dashboard** dinamis berdasarkan role dari `useAuth().role`. Mode **Pembeli** untuk role `pembeli`; mode **Penjual/Agen** untuk role `owner`, `agent`, `developer` (const `SELLER_ROLES`).
- **Buyer Mode** (`DashboardPage.jsx`): kartu ringkasan **Properti Tersimpan** (`getFavorites` + join `properties`), **Jadwal Kunjungan** (`site_visits` by `buyer_id` + join `properties`), **Pencarian Tersimpan** (`saved_searches` own), dan **Profil Keuangan** (`getFinancialProfile`) dengan status "Terisi/Belum diisi" + hint referensi KPR. Masing-masing punya daftar/empty-state + CTA ke halaman terkait.
- **Seller/Agen Mode — Statistik performa iklan** (`DashboardPage.jsx`): kartu **Total Tayangan** (aggregate `property_views` untuk properti miliknya), **Total Leads** (union distinct partner `direct_messages` + `whatsapp_leads.buyer_id`), **Jadwal Kunjungan** (`site_visits` by `property_id`), dan **Terjual** (`status == 'sold'`).
- **Seller/Agen Mode — Ringkasan Listing** (`DashboardPage.jsx`): kartu ringkasan (Total Iklan / Aktif For Sale / Dalam Antrian / Terjual) + daftar 5 listing terbaru (gambar, judul, harga, badge status) dengan tombol **"Tandai Terjual"**.
- **Fitur atribusi "Tandai Terjual"** (`DashboardPage.jsx`): tombol membuka **modal konfirmasi** dengan pilihan sumber pembeli: **A. Prospek Internal HuniOne** (dropdown nama buyer/pengguna yang pernah chat/WA — dari `direct_messages` + `whatsapp_leads`, selain role admin) atau **B. Eksternal (Luar Platform)**. Saat disimpan, properti diupdate dengan `status='sold'`, `sold_source` ('internal'|'external'), `sold_buyer_id`, dan `sold_at`.
- **Pelacakan tayangan properti** (`PropertyDetailPage.jsx`): tiap load halaman detail properti nyata (bukan `dummy-`) insert satu baris ke `property_views` (`property_id`, `viewer_id` = user login or null) dibungkus `try/catch` (gagal tetap tak masalah). Metrik views di dashboard membaca tabel ini.
- **Migration baru `20260831_dashboard_analytics.sql`** (belum di-commit; jalankan di SQL Editor Supabase): tabel `property_views` (`id`, `property_id` FK→properties cascade, `viewer_id` FK→profiles set-null, `viewed_on` date default today, unique `(property_id, viewer_id, viewed_on)` + index `(property_id, viewed_on desc)`, RLS: siapa pun login boleh insert, seller lihat punya sendiri, admin lihat semua); kolom atribusi `properties` + `sold_source` text, `sold_buyer_id` UUID FK→profiles, `sold_at` timestamptz (policy update seller sudah ada dari `20260813_fix_rls_recursion.sql`).
- **Komit (frontend)** & di-commit: `src/App.jsx`, `src/components/DashboardPage.jsx` (baru), `src/components/PropertyDetailPage.jsx`. Migration SQL diserahkan manual — **belum di-push**.


## Changelog — HuniBot Sebagai Kontak Virtual di ChatHub (31 Agustus 2026)
- **HuniBot masuk daftar kontak ChatHub** (`ChatHubPage.jsx`, `HuniBotRoom.jsx` baru): kontak virtual **"HuniBot"** (ID `'hunibot'`, non-DB) selalu tampil di posisi teratas daftar kontak dengan **avatar bot bergradien ungu** (`#7C3AED`), badge **"AI Assistant"** bergradien, dan label "Asisten properti AI · Online". Menggantikan widget melayang di halaman `/chat` (widget `HuniBot.jsx` tetap `return null` di rute chat).
- **Room chat AI khusus** (`HuniBotRoom.jsx`): saat `activeContactId === 'hunibot'`, bukan fetch `direct_messages`, melainkan komponen AI standalone yang me-render bubble (user kanan gradien biru, bot kiri avatar bot + bubble putih), greeting + **quick replies** (KPR, BPHTB, rumah pertama, SHM/HGB), input auto-grow, dan **typing indicator** saat AI mengetik.
- **Message hijacking**: kirim via room HuniBot **TIDAK insert ke tabel `direct_messages`** — input dipanggil ke endpoint **`/api/groq`** (`purpose: 'chat'`, model `openai/gpt-oss-120b`) dengan riwayat 10 pesan terakhir + konteks profil finansial user (`getFinancialProfile`); guard ditambah di `handleSend`/`handleSendImage` agar `activeContactId === 'hunibot'` tidak pernah menyentuh Supabase.
- **UI disesuaikan untuk room AI**: tombol lampiran (gambar/properti), pencarian riwayat, dan export CSV **disembunyikan** di ruangan HuniBot (AI belum mendukung input gambar); header percakapan menampilkan avatar bot + "AI Assistant · Asisten properti", tanpa link profil. Efek fetch/mark-read/typing/pin/realtime di-skip saat room `'hunibot'`.
- **Tidak ada perubahan database** — fitur ini murni frontend.

## Changelog — ChatHub UX: Mark All Read, Filter Kontak, Saran Konteks Properti, Link Profil, Draft Persisten, Soft Delete Pesan (31 Agustus 2026)
- **Chat: tandai semua sudah dibaca** (`ChatHubPage.jsx`): tombol `CheckCheck` di header daftar kontak → `handleMarkAllRead` menandai semua `direct_messages` (receiver = user, `read_at` null) sebagai dibaca via satu UPDATE; menonaktifkan diri otomatis bila tak ada pesan belum dibaca.
- **Chat: filter daftar kontak** (`ChatHubPage.jsx`): chip filter **Semua / Belum dibaca / Agent / Owner** beserta jumlahnya (state `contactFilter`) — menyaring `filteredContacts` berdasarkan role (`agent`/`developer`/`admin` → Agent, `owner` → Owner) atau unread (`unreadMap[id] > 0`), dikombinasikan dengan pencarian nama.
- **Chat: saran pertanyaan konteks properti** (`ChatHubPage.jsx`): `EmptyChat` kini menampilkan saran spesifik properti (masih tersedia? / harga nego / survei / spesifikasi) saat obrolan dibuka dari konteks properti (`contextProperty`), bukan saran umum.
- **Chat: link profil di header percakapan** (`ChatHubPage.jsx`): avatar + nama kontak (agent/developer/admin → `/agents/:id`, owner → `/seller/:id`) kini `Link` ke profil publik dengan indikator "· Profil"; kontak role lain (pembeli) tetap non-link.
- **Chat: draft per kontak persisten ke localStorage** (`ChatHubPage.jsx`): `drafts` di-backup ke `localStorage` (`hunione-chat-drafts-{userId}`) — draft tidak hilang saat reload/pindah kontak; memuat ulang saat `userId` berubah dan menyimpan setiap perubahan.
- **Chat: soft delete pesan (`deleted_at`)** (`ChatHubPage.jsx`, migration `20260831_chat_soft_delete.sql`):
  - Pengirim kini **menandai pesannya sebagai dihapus** (UPDATE `deleted_at`, bukan DELETE permanen) → riwayat & balasan tetap terjaga.
  - Table `direct_messages` + kolom `deleted_at` (timestamptz).
  - **Placeholder "Pesan ini telah dihapus"** dirender menggantikan bubble (kanan/kiri sesuai pengirim); sematan milik pesan yang dihapus ikut dilepas.
  - **Fallback balasan ke pesan yang dihapus/hilang**: blok balasan di bubble kini menampilkan "Pesan ini telah dihapus" bila `reply_to_id` menunjuk pesan yang sudah tidak ditemukan (bukan kosong/terpotong).
  - RLS: grant `update (deleted_at)`; policy receiver dipertahankan (`with check deleted_at is null` — receiver tidak bisa menghapus); policy baru `Users can delete their own sent messages` (sender, `deleted_at is not null`).
  - Catatan: perubahan ini butuh migration **`20260831_chat_soft_delete.sql`** dijalankan di SQL Editor Supabase sebelum fitur aktif.

## Changelog — Chat Berbagi Gambar & Properti, Reply, Pin, Online Presence, Export CSV; Kontak 100% HuniOne; AI Alamat RT/RW/Kelurahan (31 Agustus 2026)
- **Chat: reply pesan, lampiran gambar, berbagi properti** (`058e5dc`, `2c601dd`, migration `20260830_chat_reply_attachments.sql`):
  - Kolom baru `direct_messages`: `reply_to_id` (UUID → `direct_messages.id`), `image_url` (TEXT — URL publik storage), `property_id` (UUID → `properties.id`).
  - **Reply**: tombol Balas di bubble/menu → `ReplyPreview` di atas input menampilkan pesan yang dibalas (label "Kamu"/"Lawan bicara" + konten/kartu), disimpan sebagai `reply_to_id` saat kirim.
  - **Lampiran gambar**: bucket storage baru **`CHAT_IMAGES`** (public, 5MB, whitelist jpeg/png/webp/avif; policy upload/update/delete hanya folder `{auth.uid()}`). Flow: pick foto (`openImagePicker`) → **modal pratinjau gaya WhatsApp** (`ImagePreviewModal`) dengan field caption + tombol Kirim → kompresi (`compressImage`) → upload ke `CHAT_IMAGES/{userId}/...` → `image_url` disimpan. Bubble gambar → **lightbox** (Prev/Next + download blob). Validasi MIME/ukuran sebelum upload.
  - **Berbagi properti**: tombol plus (+) → `PropertyPicker` (cari properti milik user via `properties` `seller_id` + hasil, ketik kata kunci) → `PropertyMessage` card di chat (fetch properti, tampilkan gambar + judul + harga + CTA buka detail/WA). Disimpan sebagai `property_id`.
- **Chat: pinned messages per percakapan** (`883dd50`, migration `20260830_pin_messages.sql`): tabel baru `pinned_messages` (`id`, `user_id` FK→auth.users cascade, `chat_id` TEXT = `[a,b].sort().join('-')`, `message_id` FK→direct_messages cascade, `created_at`, unique `(user_id, message_id)`; RLS owner-only + index `(user_id, chat_id)`). Toggle pin via tombol `Pin`/`PinOff` di bubble & menu aksi ("Sematkan"/"Lepas Sematan"), disimpan lokal per room; **section "Disematkan"** di bawah header percakapan menampilkan semua pin (terbaru dulu; gambar/kartu properti dirender sebagai label `[Gambar]`/`[Kartu properti]`).
- **Chat: online presence indicator** (`883dd50`): channel presence `app-online` — tiap user subscribe dan `track({ userId, online_at })`; `presenceState` di-sync → `onlineIds` map. Kontak ditandai **online** (titik hijau di avatar + label header). Typing presence juga sudah ada (`chat-typing-{room}` → `otherTyping`).
- **Chat: export riwayat ke CSV** (`883dd50`): tombol `handleExportChat` — bangun CSV (`\uFEFF` BOM untuk Excel, kolom `Waktu;Pengirim;Pesan`, konten gambar/kartu properti jadi `[Gambar]`/`[Kartu properti]`) → Blob → auto-download `chat-<nama>.csv`.
- **Chat: auto-grow textarea + bubble entrance & polish** (`ceb1afe`): textarea tumbuh otomatis (max 120px), Enter kirim / Shift+Enter newline, bubble masuk dengan animasi.
- **Chat: per-contact draft + scoped mark-read + unread badge konsisten** (`30fb551`, `30fb551 useChatUnread`, migration `20260830_scope_chat_update_read_at.sql`):
  - **Per-contact drafts**: `drafts` object per `activeContactId` (bukan satu state global) — setiap percakapan menyimpan drafnya sendiri.
  - **Scoped mark-read**: `useChatUnread(userId, scope)` — `markRead(contactId)` menandai semua pesan `read_at` dari kontak tersebut (`.eq('sender_id', contactId)`), badge unread per kontak & global konsisten. `useChatUnread` kini subscribe INSERT + UPDATE (decrement saat `read_at` terisi, guard `decrementedRef` per id).
  - **RLS ketat `read_at`** (`20260830_scope_chat_update_read_at.sql`): `REVOKE update on direct_messages from authenticated` + `GRANT update (read_at)` (column-level) — receiver hanya bisa mengubah kolom `read_at`, tidak bisa mengubah `content`/`sender_id`/`receiver_id`/`reply_to_id`/`image_url`/`property_id`. Policy `Users can mark received messages as read` (using/with check `auth.uid() = receiver_id`) dipasang ulang.
- **Chat: new-message FAB + scroll ke bawah** (`46ff543`, `14154e4`, `1081d2a`, `04746b5`): tombol FAB muncul saat ada pesan masuk baru & tidak di bawah; **auto-scroll ke paling bawah saat pindah kontak** (nested rAF + timeout, `scroll-behavior` di container pesan `h-full` di bawah header statis), daftar pesan scroll di dalam panel (bukan seluruh window), layout desktop diperbaiki (header statis + scroller `h-full`).
- **Contact yang belum ada di list bisa langsung di-chat** (`1562af4`): memulai chat baru dari `/chat?user=ID` membuka percakapan walau kontak belum ada di contact list (contact disisipkan sementara dari `profiles`).
- **HuniBot disembunyikan penuh di halaman chat** (`a9860ab`, `307c02e`): pada rute `/chat*`, komponen HuniBot disembunyikan total (bukan hanya FAB); di luar chat, FAB diposisikan lebih tinggi (`bottom-6`) agar tidak menutup input chat mobile.
- **Properti: 100% kontak via HuniOne Chat (hapus WhatsApp CTA)** (`f116a92`, `4e3bb0a`):
  - **Agent Card** di sidebar desktop: tombol WhatsApp/phone dihapus → **tombol primary full-width "Chat di HuniOne"** → `navigate('/chat?user=${property.seller_id}&property=${property.id}')` (buka percakapan + konteks properti yang dibicarakan).
  - **Mobile sticky bar** & **address card**: juga berubah menjadi **"Chat di HuniOne"** (in-app), bukan buka `wa.me`. Card alamat kini hanya menampilkan area-level (kota/kecamatan) + aksi chat.
  - Konteks properti dikirim via query param `&property=ID`; `ChatHubPage` membaca `property` param → `setContextProperty` / `setShareProperty` → **kartu konteks properti** tampil di atas input untuk dikirim.
- **MoneyInput reusable + formatIDR** (`db27c22`): komponen baru `MoneyInput.jsx` (label + `<input type="number" inputMode="numeric">` + **pratinjau Rupiah live** `formatIDR` di bawah input + hint) dan helper `formatIDR` di `utils/format.js`. Input numerik memakai keyboard numerik + strip non-digit di mobile (`5023933`).
- **AI address extraction + field RT/RW/Kelurahan** (`31bfac0`, `e92800c`, `9a9992e`, `991a339`, migration `20260830_property_location_rt_rw_kelurahan.sql`):
  - Kolom baru `properties.rt`, `properties.rw`, `properties.kelurahan` (text).
  - `utils/addressAI.js`: `extractAddressWithAI(text)` — kirim prompt ekstraksi alamat ke Groq `purpose:'chat'` (model gpt-oss), parse JSON (strip fenced code, robust extraction via `parseJson`), kembalikan `{ values: { rt, rw, kelurahan, kecamatan, kota, city }, missing, ambiguous }`. RT/RW digits-only, kota lewat `cleanCityName` (strip "Kota"/"Kabupaten").
  - **SellPropertyPage Step 0**: saat user isi "Alamat Lengkap", tombol **AI** mengekstrak lokasi → **pratinjau** dengan flag manual-fill per bidang (pengguna bisa koreksi). Tambah field kaskade RT, RW, Kelurahan, Kecamatan (autocomplete), Kota. `ADDRESS_FIELDS`/`ADDRESS_FIELD_LABELS` diekspor dari `addressAI.js`.
- **Property detail: galeri foto asimetris gaya Rumah123** (`7579815`, `e42ac99`): desktop `GalleryDesktop` diubah dari 1 besar + 2x2 grid menjadi **70/30 asimetris** (hero besar + thumbnail kolom kanan); properti 1 foto dirender **full-width hero** (tanpa thumbnail duplikat); placeholder hanya untuk slot tersisa; lightbox tetap dari semua tile.
- **Property detail: quick actions Save & Share** (`0661876`, `3b86ca1`): tombol cepat simpan (favorit) & bagikan di halaman detail; share lewat native `navigator.share` dengan fallback salin (abaikan `AbortError` saat batal, fallback clipboard + toast sukses). Spesifikasi di-declutter vs sticky card.
- **Error states, skeleton, a11y, generic 404** (`4aacb27`, `0ef2b59`): state error pada fetch gagal (ExplorePage, ComparePage, chat), skeleton loading untuk filter sheet, scroll filter sheet, generic 404 untuk data tidak ditemukan, perbaikan a11y & tap targets.
- **Layout: posisi konten di bawah fixed navbar** (`3b03257`, `d5a0565`): sub-header (sticky bar properti & stepper sell) diposisikan di bawah `TopNavbar` fixed, hilangkan excess top gap.
- **Explore: sinkron URL search params** (`4ae1697`): `ExplorePage` sinkronisasi filter dengan `?q=&category=&type=&price=&beds=&premium=` (via `useSearchParams`), fix smart-search retype & filter harga sewa bulanan.
- **Compare: anchor/max warning** (`cef7539`): peringatan mismatch/max link ke **CompareBar** (z-40) alih-alih toast atas yang menimpa navbar.
- **Forum: stabilkan posisi setelah kirim balasan** (`8eba28f`): hapus `scrollIntoView` agresif setelah kirim reply agar halaman tidak melompat ke footer — posisi tetap di form komentar sticky.
- **Auth hardening (signup & OAuth)** (`ee670f9`, `289b06e`): validasi session setelah signup, bungkus `signInWithOAuth` Google dengan try/catch, sinkronisasi error handling reset password, perbaikan rendering raw error object (sebelumnya menampilkan objek mentah) & judul error signup dinamis. `MinimalistLogin` memakai `noValidate` + inline field errors (password, WhatsApp) via `validatePassword`/`isValidWhatsAppNumber`.
- **Audit findings fixes** (`ad8a081`, `2830a69`): resolve temuan tingkat tinggi & utama — AI search, compare link, `ChatHubPage` ref race (`sendMountedRef`), validasi WhatsApp; lalu price review (`AdminPriceChangeQueue`), reaction realtime (forum), AI race, financial form, toggleSave, forum URL params.
- **`format.js` diperluas**: tambah `formatCompact` (RpM/RpJt/Rprb) dan `formatPriceDisplay(property)` (normalisasi label `/bulan`/`/tahun` untuk sewa, `price_period` aware) selain `formatCount`/`formatIDR` yang sudah ada.

## Changelog — Chat Mobile UX: Bubble Responsif, Lightbox Foto, Aksi Pesan, Pencarian Flash, Layout dvh (30 Agustus 2026)
- **Bubble pesan & kartu properti responsif mobile** (`ChatHubPage.jsx`, `7eab9f2`): lebar bubble pesan dan kartu konteks properti (gambar + judul + harga + tombol aksi Chat/WhatsApp) menyesuaikan layar sempit; action yang bersifat hover-only disembunyikan di mobile (touch-first) agar tidak menumpuk dan tidak "stuck" terbuka.
- **Lightbox gambar fullscreen** (`7c6eabf`): foto dalam chat bisa diketuk → modal lightbox layar penuh (backdrop gelap, `framer-motion` scale-in), navigasi **Prev/Next** antar foto, tombol **Download** (fetch foto sebagai blob lalu unduh otomatis), tombol close, serta Esc/klik backdrop untuk menutup.
- **Auto-scroll hasil pencarian + flash highlight** (`79ee721` + `5d1f38d`): navigasi hasil pencarian pesan kini auto-scroll ke pesan yang cocok dengan indikator posisi `X/Y`; pesan hasil diberi **flash highlight** — overlay `.search-flash-overlay` + keyframe `search-flash-fade` di `index.css` yang menyala 2 detik lalu memudar (state `flashMessageId` + timeout, dibersihkan saat unmount/navigasi), memudahkan menemukan match di riwayat yang panjang.
- **Menu aksi pesan di mobile (bottom sheet)** (`5d1f38d`): tombol `⋯` (MoreHorizontal) di footer bubble — tampil khusus di layar `<lg` — membuka sheet "Opsi Pesan" berisi **Balas**, **Salin Teks**, **Sematkan/Lepas Sematan**, **Hapus** (hapus hanya tersedia untuk pesan milik sendiri, lanjut ke ConfirmModal). Di desktop, hover-action kini punya tombol **Salin** (baru) dan disembunyikan di layar sentuh (`hidden lg:flex`).
- **Auto-detect link & nomor telepon** (`5d1f38d`): komponen baru `MessageText` + helper `tokenizeMessage`/`normalizePhone` — URL `http(s)` jadi `<a target="_blank" rel="noopener">` dengan `break-all`; nomor `08`/`62` (9–14 digit) jadi link **`https://wa.me/<nomor>`** (awalan `0` otomatis → `62`); tetap kompatibel dengan highlight kata kunci pencarian (`HighlightText`).
- **Salin teks pesan** (`5d1f38d`): `handleCopyMessage` memakai `navigator.clipboard.writeText`, fallback ke hidden textarea + `document.execCommand('copy')` untuk WebView/browser lama; sukses → toast global.
- **Perbaikan layout mobile (kotak input "tenggelam")** (`452be3d`):
  - Tinggi kontainer utama chat `h-[calc(100vh-56px)]` → **`h-[calc(100dvh-56px)]`** — `dvh` (Dynamic Viewport Height) ikut menyesuaikan saat URL bar browser mobile menyusut/mengembang, sehingga baris input (`bottom-0`) tidak pernah tertutup navigasi sistem HP.
  - **Footer global disembunyikan di halaman chat**: di `App.jsx`, `<Footer />` tidak dirender saat `location.pathname.startsWith('/chat')` (kembalikan `null` untuk layout chat).
  - **Safe-area padding** di area input: `py-3` → `pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]` agar kotak input + tombol Kirim tidak berbenturan dengan gesture bar iOS/Android; tetap 12px di desktop (env = 0).

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

## Changelog — Halaman Paket `/packages` + Tombol "Pelajari Lebih Lanjut" (28 Agustus 2026)
- **Halaman informasi paket baru** (`src/components/PackagesPage.jsx`, route `/packages` di `App.jsx`, lazy-loaded): menampilkan 3 paket iklan (Starter / Pro / Premium) dalam **grid 3 kolom** (`md:grid-cols-3`, 1 kolom di mobile). Tiap kartu: nama, deskripsi singkat, harga, daftar fitur (ikon `Check`), dan tombol "Pilih Paket". Paket **Pro** diberi highlight khusus (border accent, shadow, badge "Paling Populer", posisi naik `md:-translate-y-1`). Tombol "Pilih Paket" sementara mengarah ke `/coming-soon` (alur pembayaran belum dibangun).
- **Tombol "Pelajari Lebih Lanjut"** di `RoleSelectionPage.jsx`: tombol sekunder rapi (ikon `Info`, `bg-white` + `border-brand-border`, hover → `brand-primary`/`brand-accent`) di bagian bawah halaman, mengarah ke `/packages`.
- **i18n**: namespace `packages` baru (ID & EN) — judul, subtitle, nama/deskripsi/harga/fitur per paket (fitur sebagai array via `t(..., { returnObjects: true })`), label `roleSelection.learn_more`.

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
| `/` atau `/explore` | ExplorePage | Tidak | filter by status='verified', back-to-top button, lazy loading images, **Cari Properti** scroll & fokus ke kotak pencarian, quick menu "Cari Agen" → `/agents` (direktori agen publik), **pencarian populer & tombol Acak → filter nyata via `?q=`** (bukan dead-end), empty state "Belum ada properti" saat kosong |
| `/login` | MinimalistLogin | Tidak | |
| `/sell-role` | RoleSelectionPage | Ya | onboarding pilih peran sebelum iklan properti |
| `/agent-apply` | AgentApplicationPage | **Ya (login)** | form pendaftaran agen → insert `agent_applications` dengan `user_id` (20260802 — tidak lagi publik) |
| `/agents` | AgentsPage | Tidak | direktori agen publik (Top Agent, search, filter region, sort); **tombol Chat → `/chat?user=ID`** |
| `/agents/:id` | AgentDetailPage | Tidak | profil agen + listing + ulasan pembeli |
| `/agent-profile` | AgentProfilePage | Ya (agen) | kelola profil direktori agen sendiri (toggle `is_visible`, bio, dll) |
| `/sell` | SellPropertyPage (3-step) | Ya | + edit via `?edit=ID`, beforeunload guard, draft autosave |
| `/my-listings` | MyListingsPage | Ya | Edit & **Tandai Terjual** (verified→sold), status timeline **vertikal di mobile** (tidak terpotong), card sold diredupkan + catatan "Iklan telah ditandai terjual", **tab Leads** (`whatsapp_leads` per listing) |
| `/seller/:id` | SellerProfilePage | Tidak | profil penjual publik — statistik, listing, ulasan, forum posts, sticky action bar mobile, personalisasi budget |
| `/chat` | ChatHubPage (realtime DM) | Tidak (login prompt) | ArrowLeft lucide icon; **mobile UX (30 Aug 2026)**: bubble responsif, lightbox foto + download, bottom sheet aksi pesan, auto-link WA, search flash, layout `dvh` tanpa footer + safe-area input |
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
| `/packages` | PackagesPage | Tidak | info paket iklan (Starter/Pro/Premium), tombol "Pilih Paket" → `/coming-soon` |

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
- **Quick menu "Cari Agen"**: navigasi ke `/agents` (direktori agen publik)
- **Pencarian populer** (chip "rumah bandung", "apartemen jakarta", dll): mengisi query lalu menavigasi ke `/explore?q=...` — filter nyata (bukan dead-end)
- **Tombol Acak (Shuffle)**: benar-benar mengacak urutan daftar properti
- **Empty state**: saat tidak ada properti verified, tampil "Belum ada properti" + CTA jual (fallback `DUMMY_PROPERTIES` dihapus)
- **RecentlyViewed** (`<RecentlyViewed />`): kartu horizontal properti yang terakhir dilihat
- **CompareBar** (`<CompareBar />`): floating bar bottom saat ada item di keranjang banding

### 3. PropertyDetailPage
- **Gallery**: Desktop (Airbnb-style 70/30 asimetris — 20260830) / Mobile (hero + thumb grid) + Lightbox (fullscreen, keyboard nav); properti 1 foto dirender full-width hero tanpa thumbnail duplikat
- **Agent Card**: sticky sidebar (desktop), **"Chat di HuniOne"** primary full-width (20260830 — WhatsApp CTA dihapus) → `navigate('/chat?user=sellerId&property=id')`; mobile sticky bar + address card juga jadi "Chat di HuniOne"
- **KprSimulator**: mortgage calculator (sementara disembunyikan dari UI — lihat bagian KPR)
- **Properti sewa (202608)**: properti Disewa menampilkan **Simulasi Sewa** (bukan KPR), harga berlabel `/bulan`, analisis investasi & harga wajar disembunyikan, harga + affordability badge per periode
- **Properti Serupa**: grid 6 item, filter by category/city, exclude current ID, limit 6, status='verified'
- **Accordion**: Panduan Membeli + Disclaimer
- **UI/UX detail (b1dda98)**: **mobile bottom price bar** (sticky di bawah layar), **spec tiles** (KT/KM/luas/sertifikat), **map card**, harga terpajang di **sidebar desktop**
- **Share & Save**: tombol bagikan (native share, fallback clipboard; abaikan AbortError saat batal) → toast sukses/gagal (diambil dari `useAuth`); tombol simpan favorit
- **Privasi lokasi (da8f6ca)**: alamat tampil **area-level saja** (kota/kecamatan); alamat lengkap di-gate di belakang kontak agent → dibuka via chat HuniOne
- **Jadwal Survei (3428e59)**: form simpan ke `site_visits` + "Lanjut ke WhatsApp"
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
- **Badge unread di top navbar** (`TopNavbar`) + badge di item Chat drawer (perhitungan konsisten via `read_at`; `useChatUnread(userId, scope)` — scoped mark-read per kontak)
- **Typing indicator**, **paginasi** (load older messages), **date separator**, header & bubble UI yang diperhalus, **kartu konteks properti** dalam chat
- **Rich messages (20260830)**: **reply** (`reply_to_id` + `ReplyPreview`), **lampiran gambar** (bucket `CHAT_IMAGES`, pratinjau gaya WhatsApp + caption, lightbox + download), **berbagi properti** (`property_id` + `PropertyMessage` card), **pinned messages** (`pinned_messages`, section "Disematkan"), **online presence indicator** (`app-online` presence channel), **export ke CSV**, **per-contact drafts**, auto-grow textarea, new-message FAB
- **Chat UX (31 Aug 2026)**: **tandai semua sudah dibaca**, **filter kontak** (Semua/Belum dibaca/Agent/Owner), **saran pertanyaan konteks properti**, **link profil** agent/owner di header percakapan, **draft persisten ke localStorage**, **soft delete** (`deleted_at`) + placeholder "Pesan ini telah dihapus" + fallback balasan ke pesan terhapus
- ArrowLeft icon dari lucide-react (bukan custom SVG)
- **Mobile UX (30 Aug 2026)**: bubble & share-card responsif, lightbox foto fullscreen (Prev/Next + **download blob**), search auto-scroll + **flash highlight** + indikator `X/Y`, bottom action sheet (`⋯` → Balas/Salin/Sematkan/Hapus), auto-link URL & `wa.me` untuk nomor, tombol **Salin** dengan fallback `execCommand`, linkify kompatibel dengan highlight pencarian
- **Layout mobile (30 Aug 2026)**: tinggi `h-[calc(100dvh-56px)]` (dvh menggantikan vh agar input tidak tenggelam saat URL bar mobile berubah); `<Footer />` tidak dirender di `/chat` (`App.jsx`); area input pakai safe-area padding `pb-[calc(env(safe-area-inset-bottom)+0.75rem)]`; **HuniBot disembunyikan penuh di rute chat**

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
- **Sumber (20260830)**: klik WhatsApp di **`SellerProfilePage` (profil penjual publik)** (`buyer_id: user?.id || null`) — properti detail kini memakai **in-app HuniOne Chat**, bukan `wa.me`; `whatsapp_leads` tetap dicatat di profil penjual
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
- **Kolom baru (Aug 2026, migrasi terbaru)**: `published_at` (timestamptz — 20260820, diisi otomatis saat status→'verified'), `price_period` (text 'total'/'bulan'/'tahun', default 'total' — 20260822), `land_area_sqm` (numeric — luas tanah; `area_sqm` tetap luas bangunan) & `furnished` ('' / furnished / semi_furnished / unfurnished, default '') — 20260823, **`rt` & `rw` (text) & `kelurahan` (text) — 20260830** (lokasi detail, diisi AI address extraction/form iklan)
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
- **Kolom lampiran (20260830)**: `reply_to_id` (uuid → `direct_messages.id` — pesan yang dibalas), `image_url` (text — URL publik dari bucket `CHAT_IMAGES`), `property_id` (uuid → `properties.id` — kartu properti yang dibagikan)
- **Soft delete (20260831)**: kolom `deleted_at` (timestamptz) — pengirim menandai pesannya dihapus via UPDATE (bukan DELETE permanen); placeholder "Pesan ini telah dihapus" dirender kedua sisi; riwayat & balasan tetap terjaga.
- **RLS UPDATE dibatasi kolom read_at + deleted_at (20260830 + 20260831)**: `REVOKE update on direct_messages from authenticated` + `GRANT update (read_at)` (20260830) lalu `GRANT update (deleted_at)` (20260831). Receiver hanya bisa mengubah `read_at` (policy `Users can mark received messages as read`, `with check auth.uid() = receiver_id and deleted_at is null` — receiver tidak bisa menghapus); sender hanya bisa mengubah `deleted_at` (policy `Users can delete their own sent messages`, `using/with check auth.uid() = sender_id and deleted_at is not null`). Kolom lain (`content`/`sender_id`/`receiver_id`/`reply_to_id`/`image_url`/`property_id`) tak bisa diubah klien.

### Table `pinned_messages` (baru — 20260830, sematan chat per user per percakapan)
- `id` (uuid PK, default gen_random_uuid()), `user_id` (FK → auth.users, cascade), `chat_id` (text — kunci room `[a,b].sort().join('-')`), `message_id` (FK → direct_messages, cascade), `created_at`
- Unique `(user_id, message_id)`; index `(user_id, chat_id)`.
- RLS: owner-only (select/insert/delete `auth.uid() = user_id`).

### Storage bucket `CHAT_IMAGES` (baru — 20260830)
- Public, file_size_limit 5MB, allowed MIME jpeg/png/webp/avif.
- Policy: INSERT/UPDATE/DELETE hanya jika `bucket_id = 'CHAT_IMAGES'` dan `(storage.foldername(name))[1] = auth.uid()::text` (upload hanya ke folder milik sendiri).
- Path: `{userId}/{timestamp}-{rand}-{sanitizedFileName}`, public URL via `getPublicUrl()`. Dipakai `ChatHubPage.uploadChatImage`.

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
- Sumber data: klik WhatsApp di **SellerProfilePage** (20260830 — properti detail kini pakai in-app chat); dibaca MyListingsPage (tab Leads) & AdminDashboardPage

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
- `set_whatsapp_verified(text)` — simpan nomor WhatsApp + set `whatsapp_verified=true` (owner-only, security definer; 20260828); **diperkuat 20260829**: normalisasi & validasi di backend (digits 10-14, awalan `08`/`620` → `62`, tolak duplikat akun lain — cocok dengan partial UNIQUE index `profiles.whatsapp`)
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
9. `20260731_create_property_ai_analysis.sql` — tabel `property_ai_analysis` (cache AI per properti) + RLS select/insert/update semua *(tulis dibatasi hanya via RPC `set_property_ai_analysis` service_role sejak 20260808)*
10. `20260731_create_site_visits.sql` — tabel `site_visits` + RLS buyer (select/insert milik sendiri, update hanya → 'cancelled')
11. `20260731_create_user_financial_profiles.sql` — tabel `user_financial_profiles` + RLS owner
12. `20260801_forum_enhancements.sql` — kolom baru forum_posts (views/is_pinned/solved_reply_id/tags/poll) + tabel `forum_reactions` + `forum_poll_votes` + migrasi data forum_likes → reactions
13. `20260801_create_agent_applications.sql` — tabel `agent_applications` + RLS + trigger approval role promotion
14. `20260802_agent_applications_require_login.sql` — kolom `agent_applications.user_id` + **wajib login** (policy INSERT `user_id = auth.uid()`, SELECT milik sendiri) + trigger approval cocokkan profil via `user_id` (fallback email)
15. `20260803_agent_directory.sql` — tabel `agent_profiles` + `agent_reviews`, view `agent_stats`, `handle_agent_approval()` trigger
16. `20260803_property_listing_enhancements.sql` — constraint `property_type` + kolom `is_premium`
17. `20260804_audit_log_security.sql` — RPC `record_audit` (security definer, hanya admin) + `audit_logs` dikunci
18. `20260805_property_seller_type.sql` — kolom `seller_type`/`agent_id`/`owner_id` + trigger `enforce_property_seller_type()`
19. `20260806_agent_integrity_fixes.sql` — policy insert `agent_profiles` (role agent), view `agent_stats` fix (`seller_type='agent'`), trigger hanya validasi saat kolom berubah
20. `20260807_agent_directory_completion.sql` — selesaikan direktori agen (drop kolom mati `properties.agent_id`/`owner_id`)
21. `20260808_security_hardening.sql` — **RLS profiles/properties**: normalisasi role + constraint, email privat, role guard, cache AI via RPC `set_property_ai_analysis` (service_role), RPC `get_my_profile`/`get_admin_users`
22. `20260808_admin_delete_agent_applications.sql` — policy DELETE `agent_applications` (admin) + action audit `delete_agent_application`
23. `20260809_storage_upload_policy.sql` — policy upload storage (whitelist mimetype `metadata->>'mimetype'`, `owner_id = auth.uid()::text`)
24. `20260809_drop_legacy_audit_columns.sql` — hapus kolom audit lama yang tidak dipakai
25. `20260810_forum_rls_and_handle_new_user.sql` — RLS `forum_posts`/`forum_replies` (author+admin), RPC `increment_forum_views`, trigger `handle_new_user()` (auto-create profil saat signup)
26. `20260811_seller_can_mark_sold.sql` — seller boleh `verified → sold` *(DIGANTIKAN oleh 20260813 — masih ada bug 42P17)*
27. `20260812_seller_mark_sold_any_status.sql` — seller boleh `sold` dari status apa pun *(DIGANTIKAN oleh 20260813 — masih ada bug 42P17)*
28. `20260813_fix_rls_recursion.sql` — **fix 42P17**: helper `is_admin()`, policy sederhana (tanpa subquery self-ref), trigger `enforce_property_status_transition()` + `enforce_profile_role_change()`
29. `20260815_admin_super_admin_role_guard.sql` — kolom `is_super_admin`, trigger `enforce_role_super_guard()`, admin lama otomatis jadi super admin, `get_admin_users()` ekspos `is_super_admin`
30. `20260816_price_history.sql` — kolom `properties.original_price`, tabel `price_history`, `log_price_change()`, update `guard_property_price_change()`
31. `20260816_property_price_change_guard.sql` — kolom harga (`price_requested`, `price_change_status`, dll) + trigger guard ≤15% → langsung, >15% → antrian admin
32. `20260816_whatsapp_leads.sql` — tabel `whatsapp_leads` + RLS (insert publik, select seller/admin) *(insert diperketat wajib login sejak 20260818)*
33. `20260817_saved_searches.sql` — tabel `saved_searches` + RLS owner-only
34. `20260818_security_gap_fixes.sql` — **penutup celah audit**: trigger `saved_properties` (user_id otomatis), agent_profiles self-read, whatsapp_leads wajib login, site_visits select seller/admin
35. `20260819_property_reports.sql` — tabel `property_reports` + RLS (pelapor/admin) + audit `delete_property`/`dismiss_report` + policy hapus foto storage admin
36. `20260820_property_published_at.sql` — kolom `properties.published_at` + trigger `set_property_published_at()` (definisi "properti baru" saat status → verified)
37. `20260820_seller_survey_visits.sql` — alur survei sisi seller: policy UPDATE `site_visits` (seller/admin) + realtime `site_visits`
38. `20260821_chat_read_receipts.sql` — kolom `direct_messages.read_at` + policy UPDATE receiver + realtime `direct_messages`
39. `20260822_property_price_period.sql` — kolom `properties.price_period` ('total'/'bulan'/'tahun') + backfill sewa → 'bulan'
40. `20260823_property_detail_fields.sql` — kolom `properties.land_area_sqm` & `furnished` (kondisi isi properti sewa)
41. `20260824_create_newsletter_subscribers.sql` — tabel `newsletter_subscribers` + RLS (INSERT publik, SELECT/UPDATE/DELETE admin-only)
42. `20260826_add_nib_to_agents.sql` — kolom `nib` di `agent_applications` & `agent_profiles` + update trigger `handle_agent_approval()` menyalin `nib` saat approval
43. `20260828_whatsapp_verification.sql` — kolom `whatsapp_verified` (bool) di `profiles`; update trigger `handle_new_user()`; backfill user dgn WhatsApp; perpanjang RPC `get_my_profile()` (+`whatsapp_verified`); RPC baru `set_whatsapp_verified(text)`
44. `20260829_whatsapp_verification_hardening.sql` — **hardening WhatsApp**: partial UNIQUE index `profiles.whatsapp` (nilai non-empty unik → 1 nomor 1 akun, NULL/empty tetap bebas); perkuat RPC `set_whatsapp_verified` (validasi & normalisasi di **backend**: hanya digit 10-14, awalan `08`/`620` → `62`, tolak nomor duplikat milik akun lain)
45. `20260830_property_location_rt_rw_kelurahan.sql` — kolom `properties.rt`, `properties.rw`, `properties.kelurahan` (detail lokasi, diisi AI address extraction/form iklan)
46. `20260830_chat_reply_attachments.sql` — kolom `direct_messages.reply_to_id`/`image_url`/`property_id` + bucket storage `CHAT_IMAGES` + policy upload/update/delete (folder per user)
47. `20260830_pin_messages.sql` — tabel `pinned_messages` (sematan chat per user per percakapan) + RLS owner-only + index `(user_id, chat_id)`
 48. `20260830_scope_chat_update_read_at.sql` — **chat hardening**: `REVOKE update on direct_messages` + `GRANT update (read_at)` (column-level) supaya receiver hanya bisa mengubah `read_at`; pasang ulang policy `Users can mark received messages as read`
 49. `20260831_chat_soft_delete.sql` — **chat soft delete**: kolom `direct_messages.deleted_at` + `GRANT update (deleted_at)`; policy receiver `with check deleted_at is null`; policy baru `Users can delete their own sent messages` (sender)
 50. `20260831_dashboard_analytics.sql` — **dashboard analytics & atribusi terjual**: tabel `property_views` (tayangan per property per viewer per hari, unique + RLS: insert any login, seller lihat punya sendiri, admin semua); kolom `properties.sold_source`/`sold_buyer_id`/`sold_at` (atribusi sumber pembeli internal/eksternal saat Tandai Terjual). **Belum dijalankan — serahkan ke admin SQL Editor.**

**Catatan**: PostgreSQL 14 tidak support `CREATE POLICY IF NOT EXISTS` — harus pakai `DROP POLICY IF EXISTS` dulu sebelum `CREATE POLICY`. Migration terbaru memakai blok `do $$ ... exception when duplicate_object` untuk idempotency.
