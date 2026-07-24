# Project Vastara — Full Codebase Summary

## Overview
A React-based property marketplace web app (buy/sell/rent) targeting the Indonesian market. Built with Vite, styled with Tailwind CSS v4, internationalized with i18next, and backed by Supabase.

## Tech Stack
- **Framework:** React 19 (JSX, no TypeScript)
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Routing:** react-router-dom v7
- **Animation:** framer-motion v12
- **Icons:** lucide-react + custom inline SVGs
- **i18n:** i18next v26 + react-i18next v17 (ID/EN)
- **Backend:** Supabase (auth, database, storage)
- **Maps:** leaflet + react-leaflet (installed but unused)
- **Linting:** ESLint v10 (flat config)
- **Deployment:** Vercel

## Project Structure

```
projectVastara/
├── index.html                     # Vite entry HTML
├── vite.config.js                 # Vite config (React + Tailwind plugins)
├── eslint.config.js               # ESLint flat config
├── vercel.json                    # SPA rewrites for Vercel
├── package.json
├── README.md                      # (boilerplate, not customized)
├── .env.local                     # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│
└── src/
    ├── main.jsx                   # Entry point: renders <App /> into #root
    ├── App.jsx                    # Root component: auth, routing, layout
    ├── i18n.js                    # i18next config (lng: 'id', fallback: 'en')
    ├── index.css                  # Global styles + Tailwind @theme tokens
    ├── supabaseClient.js          # Supabase client init from env vars
    │
    ├── components/                # All 14 page/component files (.jsx)
    │   ├── TopNavbar.jsx          # Fixed top bar + language switcher + hamburger
    │   ├── HamburgerMenu.jsx      # Slide-out nav menu + SavedDrawer sub-component
    │   ├── ExplorePage.jsx        # Main landing page (hero, search, listings, favorites)
    │   ├── PropertyDetailPage.jsx # Property detail with image, specs, WA button
    │   ├── MinimalistLogin.jsx    # Login/Register form (email + password + Google)
    │   ├── SellPropertyPage.jsx   # Multi-step form to list a property (5 steps)
    │   ├── ProfileDrawer.jsx      # User profile drawer (edit info, logout, saved properties)
    │   ├── SavedPropertiesPage.jsx# Full-page view of saved/favorited properties
    │   ├── NotificationDrawer.jsx # Notification panel with sections
    │   ├── MoreCategoriesDrawer.jsx# Bottom sheet with extra property categories
    │   ├── RescheduleBottomSheet.jsx# Date/time picker for rescheduling surveys
    │   ├── ChatHubPage.jsx        # Contact agents + FAQ accordion
    │   ├── ComingSoonPage.jsx     # Placeholder for unfinished features
    │   └── NotFoundPage.jsx       # 404 / property-not-found page
    │
    ├── data/
    │   └── dummyProperties.js     # 5 hardcoded property objects (fallback data)
    │
    ├── locales/
    │   ├── id/translation.json    # Indonesian translations (220 keys)
    │   └── en/translation.json    # English translations (220 keys, same structure)
    │
    └── utils/
        └── favorites.js           # localStorage-based favorites CRUD
```

## Routing (App.jsx)

| Path           | Component           | Auth Required |
|----------------|---------------------|---------------|
| `/`            | ExplorePage         | No            |
| `/explore`     | ExplorePage         | No            |
| `/login`       | MinimalistLogin     | No            |
| `/sell`        | SellPropertyPage    | Yes           |
| `/chat`        | ChatHubPage         | No            |
| `/property/:id`| PropertyDetailPage  | No            |
| `/coming-soon` | ComingSoonPage      | No            |
| `*`            | Redirect → `/`      | —             |

## Component Details

### TopNavbar.jsx
- Fixed header with "Vastara" brand, language switcher dropdown (ID/EN), "Jual Properti" CTA, and hamburger toggle
- Language switcher uses `i18n.changeLanguage()`, closes on outside click via `useRef` + `mousedown` listener

### HamburgerMenu.jsx
- Slide-in drawer with overlay (framer-motion)
- States: logged-in user card with avatar initial, guest "Login / Register" button
- Menu sections: "Umum" (Tersimpan), "Menu Utama" (Eksplor, Chat), "Pengaturan" (Informasi Pribadi, Log Out)
- **SavedDrawer sub-component**: Fetches properties from Supabase filtered by `getFavorites()` IDs from localStorage; shows empty state "Belum ada properti disimpan"

### ExplorePage.jsx (601 lines — largest component)
- Hero banner with gradient overlay, welcome text, search tabs (Dijual/Disewa/Baru), search input with filter button
- Quick Action grid (8 items: Carikan Properti, Iklankan, etc.)
- Recommendations carousel (horizontal scroll, no-scrollbar)
- Popular Searches section (4 cards with tags)
- Full property listing with sort, filter (bottom sheet), and save/favorite toggle
- Filter sheet: property type (5 options), price range (3 tiers), bedrooms (1–5+)
- Falls back to `DUMMY_PROPERTIES` when Supabase data is empty
- Save/favorite heart button uses localStorage via `utils/favorites.js`

### PropertyDetailPage.jsx
- Fetches property by ID: dummy IDs (`dummy-*`) match local data, others query Supabase
- Hero image with gradient overlay, location, title
- Specs: bedrooms, bathrooms, sqm with custom SVG icons
- Description (with fallback template)
- Sticky bottom CTA: WhatsApp button linking to agent

### MinimalistLogin.jsx
- Toggle between Login and Register views
- Login: email + password with show/hide toggle
- Register: first name, WhatsApp, email, password, confirm password
- Google button (rendered but no onClick handler — dead UI)
- Uses Supabase auth (`signInWithPassword` / `signUp`)
- `getFirstName()` function defined but never called (dead code)

### SellPropertyPage.jsx (752 lines)
- 5-step vertical stepper wizard with validation per step
  - Step 0: WhatsApp number (with +62 prefix)
  - Step 1: Property title, type (select), certificate status (select), estimated price (numeric input with live IDR formatting)
  - Step 2: Address (textarea), Google Maps link
  - Step 3: Area, bedrooms, bathrooms, description
  - Step 4: Document upload (PDF/JPG/PNG, max 5MB) to Supabase Storage, or skip checkbox
- Submits to Supabase `properties` table (without `whatsapp` field — bug)
- Shows success modal with agent WhatsApp link
- Uses `AppToast` for inline notifications
- Agent WhatsApp fetched from Supabase `agents` table

### ProfileDrawer.jsx
- Slide-in drawer with: notification toast, personal info form (name, email, WhatsApp), saved properties section, logout button
- Password confirmation required to save changes
- Updates Supabase auth + profiles table
- Saved properties section: fetches from Supabase filtered by `getFavorites()` IDs, falls back to local dummy data
- Sticky bottom: password input + save button

### SavedPropertiesPage.jsx
- Standalone page showing user's saved properties
- Fetch from Supabase filtered by `getFavorites()` IDs
- Filter chips: "Semua", "Tersedia", "Sedang Nego"
- Heart toggle button per property card (persists to localStorage)
- Status badges (verified → Tersedia, pending → Sedang Nego)

### NotificationDrawer.jsx
- Mock notification data (3 items in 2 sections: Hari Ini, Kemarin)
- Per-type icons: legal (shield), survey (calendar), promo (megaphone)
- "Tandai semua dibaca" button
- TOTO comments indicate planned Supabase integration

### MoreCategoriesDrawer.jsx
- Bottom sheet with grid of property types (buy: 6, rent: 5)
- "NEW" badge on rent category items
- All items navigate to `/coming-soon`

### RescheduleBottomSheet.jsx
- Date picker (7 days) + time picker (9 slots)
- Agent info display
- "Konfirmasi Jadwal" button (TODO: Supabase integration)
- `DAYS` array defined but unused (dead code)

### ChatHubPage.jsx
- Agent contact cards (2 hardcoded: Aqsha, Tim Legal Rai)
- Online indicator, WhatsApp chat CTA
- FAQ accordion (3 items: KPR, booking fee, legal process)
- Operating hours indicator (09:00–18:00 WIB)
- TODO comments for future Supabase integration

### ComingSoonPage.jsx
- Simple placeholder with Wrench icon + "Kembali ke Eksplor" button

### NotFoundPage.jsx
- Shows when property detail fails to load or URL is invalid
- Customizable message prop, fallback default
- Two buttons: "Kembali ke Beranda" + "Cari Properti Lain"

## Design System (index.css)

### Tailwind @theme Tokens
```css
--color-brand-primary: #183B63;     /* Dark navy - primary actions, headers */
--color-brand-secondary: #4F8FD8;   /* Blue - secondary actions, links */
--color-brand-bg: #EEF3F7;          /* Light gray-blue - page background */
--color-brand-surface: #FFFFFF;      /* White - cards, drawers, inputs */
--color-brand-text: #1C2733;        /* Dark slate - body text */
--color-brand-muted: #66788A;       /* Gray - secondary text, placeholders */
--color-brand-border: #D6DEE7;      /* Light gray - borders, dividers */
```

### Utility Classes
- `.no-scrollbar` — hides scrollbar (WebKit + Firefox)
- `.animate-slide-up` — keyframe for bottom sheets

### Conventions
- Emerald palette (`emerald-50/500/600`) for success states, verified badges
- Red palette (`red-50/500`) for errors, destructive actions, logout
- Shadows: `shadow-sm` for cards/CTAs, `shadow-xl` for drawers/modals
- Hover: `hover:brightness-90` for solid buttons, `hover:bg-brand-bg` for ghost buttons
- Active: `active:scale-[0.97]` or `active:scale-[0.98]` for press feedback
- Rounded: `rounded-xl` (12px) for buttons/cards, `rounded-2xl` (16px) for larger containers, `rounded-3xl` (24px) for modals
- Transition: `transition-colors` for color-only, `transition-all duration-200` for animations

## Internationalization (i18n.js)

```js
i18n.use(initReactI18next).init({
  resources: { id: { translation: id }, en: { translation: en } },
  lng: 'id',          // Default: Indonesian
  fallbackLng: 'en',  // Fallback: English
  interpolation: { escapeValue: false },
})
```

### i18n Key Structure
- `navbar.*` — top navigation bar
- `explore.*` — main explore page (hero, search, quick_menu, recommendations, popular_searches, all_properties, filter, property_card)
- `login.*` — login/register form
- `comingSoon.*` — coming soon page
- `profileDrawer.*` — profile drawer (form, notifications, saved)
- `sellProperty.*` — sell property wizard (steps, forms, success, errors)

## Data Layer

### Supabase Tables (referenced in code)
- `properties` — property listings (used extensively)
- `profiles` — user profile data
- `agents` — agent contact info
- `legal_documents` — Supabase Storage bucket for document uploads

### Dummy Data (fallback)
5 hardcoded properties in `src/data/dummyProperties.js` with IDs `dummy-1` through `dummy-5`. Used when:
- Supabase response is empty (ExplorePage)
- Property ID starts with `dummy-` (PropertyDetailPage)
- Supabase query fails (ProfileDrawer saved section)

### Favorites (utils/favorites.js)
```js
const STORAGE_KEY = 'vastara_favorites'

getFavorites()           // Returns array of saved property IDs from localStorage
toggleFavorite(id)       // Toggle a property ID, returns updated array
isFavorite(id)           // Check if ID is saved
clearFavorites()         // Remove all favorites
```

## Known Bugs & Issues

### Critical
1. **Filter broken in ExplorePage** (line 160): Filters compare `p.title` with the type value (e.g., "Rumah"), but titles are descriptive strings like "Cluster Mewah...". Fixed to use `p.property_type || p.category`.
2. **WhatsApp not saved in SellProperty** (line ~326): `form.whatsapp` (seller's phone) is collected but never included in the Supabase insert object.
3. **Email change desync** (ProfileDrawer): `updateUser()` triggers confirmation email but code immediately updates local state — subsequent saves re-auth with unconfirmed email.
4. **Auto-verified listing** (SellPropertyPage line 321): Simply uploading any document sets `status: 'verified'`, bypassing actual verification.

### High
5. **No try/catch on async Supabase calls** across multiple components — network errors cause unhandled promise rejections.
6. **Google button has no onClick** (MinimalistLogin line 174) — dead UI.
7. **Missing i18n in NotFoundPage** — "Kembali ke Beranda" and "Cari Properti Lain" are hardcoded.
8. **Unused `DAYS` array** in RescheduleBottomSheet line 4.

## Build & Run
```bash
npm run dev      # Vite dev server (HMR on localhost)
npm run build    # Production build → dist/
npm run preview  # Preview production build
npm run lint     # ESLint check
```

## Key Patterns to Note
- **No TypeScript** — all files are plain `.jsx`
- **No state management library** — all state is local `useState` + prop drilling
- **No React Context** — auth state lives in `App.jsx` and is passed as props
- **No custom hooks** — all logic is inline in components
- **SVG icons** — defined as inline React components (no external icon library except lucide-react)
- **Loading states** — spinners for async operations, skeleton for property detail
- **Error handling** — inline error messages in state, notifications via toast/snackbar
- **Animation** — spring physics for drawers/sheets, duration-based for page transitions
- **Code comments** — `TODO` comments mark Supabase integration points not yet implemented
