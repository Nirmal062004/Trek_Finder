# Trek Finder — Fix Log

## Aim
Audit the Trek Finder project (Next.js frontend + Supabase backend), list broken/outdated files and functions, prioritize them, and fix them one by one. Keep this doc updated so the next session can pick up just by reading it.

## Project Structure
- `Frontend/` — Next.js 16 app (React 18, maplibre-gl, framer-motion, supabase-js)
- `Backend/` — Supabase Edge Functions (Deno) + SQL migrations (PostGIS)
- Branch: `New_Map_UI` (base: `WEB_VERSION_1`)

## Current Git Status (start of session)
Modified: package-lock, package.json, deleted 3 public SVGs, modified chat/finder/page/profile/page.tsx, Home.module.css, deleted theme.ts
New (untracked): AvatarEditor.tsx, LiveBackground.tsx, TrekCard.tsx

## Findings — Broken / Needs Fix (Priority Order)

### P1 — Build-breaking / runtime crashes
1. **File names swapped**: `MapFeature.tsx` contains canvas particle code (should be `LiveBackground.tsx`) and `LiveBackground.tsx` contains maplibre map code (should be `MapFeature.tsx`). The components are misnamed relative to their content and imports will break. [`Frontend/src/components/MapFeature.tsx`, `Frontend/src/components/LiveBackground.tsx`]
2. **`MapFeature.tsx` uses `process.env.NEXT_PUBLIC_MAPTILER_KEY`** — env var is set in `.env.local` but missing from `.env.example`. Map style URL will be undefined in production/deploy.
3. **`Frontend/src/styles/theme.ts` deleted** — check if anything imports it.
4. **Deleted public SVGs** (`hero-bg.svg`, `mountain-divider.svg`, `wave-divider.svg`) — check if anything still references them.
5. **Missing images/videos** referenced in gallery/login/signup (`/assets/img/image.jpg`, `/assets/video/forest.mp4`, `forest2.mp4`) — Git LFS may not have pulled them.

### P2 — Logic bugs / wrong behavior
6. **Finder page (`finder/page.tsx`)**: `searchLocationAndZoom` and `handleMapClick` duplicate Overpass query logic; `handleMapClick` filters results but `searchLocationAndZoom` doesn't. Inconsistent.
7. **Finder page**: `pendingFilters`/`pendingRadius` pattern — "Apply Filters" button only sets filters when they differ; `useEffect` depends on `filters` (not `pendingFilters`). Intended, verify behavior.
8. **Finder page**: `useEffect` dependency on `markers` triggers refilter on every map click; `mapCenter` in deps causes refilter when map pans. May cause unnecessary refetches.
9. **Profile page**: `xp`/`level` computed during render; `nextLevelXp` = `level * 100` but progress uses `xp / nextLevelXp` — off-by-one in "XP to Level {level + 1}" text.
10. **Chat page**: `wsService` is simulated (no real connection). Random messages fire every 15s. Demo-acceptable; note it.
11. **Gallery page**: imports `galleryData` (`@/shared/data/galleryData`) — actual file is `galleryData.ts`; build passed so import resolves fine. OK.
12. **Admin page**: calls `backendAPI.deleteReview` — VERIFIED `deleteReview` does NOT exist in `api.ts` (only `deleteCommunity` exists). Runtime bug: clicking Delete on a review throws. [`Frontend/src/components/.../admin/page.tsx:100`, `Frontend/src/shared/services/api.ts`]
13. **Settings page**: `handleClearCache` calls `localStorage.clear()` which wipes the auth token too — logs user out unexpectedly. [`Frontend/src/app/settings/page.tsx:100-105`]
14. **`Navigation.tsx`**: `<item.icon size={18} />` — passing `size` prop to a JSX element; works for lucide icons but not type-safe. Low risk.

### P3 — Missing / dead code
15. `backendAPI` comment says "Legacy trekAPI and healthCheck removed as backend is gone" — but `searchTreks`, `addBookmark`, `sendMessage` still reference `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` which is NOT set in `.env.local`. These will throw "Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL" if called.
16. Edge Functions (`search`, `chat`, `bookmark`, `review`) are Deno-based and reference `createAuthClient` — need deployment; not part of frontend build.

### P4 — Polish / upgrades
17. TypeScript `strict: true` but many `any` types (`Trek = any` in home page).
18. No test files.
19. `package.json` uses `next: ^16.1.6` — Next 16.1.6 installed and build passes. Compatible with React 18.

## In Progress
(None yet)

## In Progress
(None yet)

## Completed
- P1a: Fixed build-breaking syntax error in `src/app/page.tsx:297` — extra `)` after `.map()` close caused `TS1005: '}' expected`. TypeScript now passes clean (`tsc --noEmit` passes with no errors).
- P1b: Fixed swapped component files — `MapFeature.tsx` now contains maplibre map code and `LiveBackground.tsx` now contains canvas particle code (they were swapped, which would break both home page and finder page at runtime).
- P1c: Added missing `NEXT_PUBLIC_MAPTILE_KEY` to `.env.example` (MapFeature uses `process.env.NEXT_PUBLIC_MAPTILER_KEY` for map style/terrain URLs).
- P2-12: Added missing `backendAPI.deleteReview` to `api.ts` (admin page called it but it didn't exist — runtime bug).
- P2-13: Fixed Settings `handleClearCache` to preserve auth token instead of wiping all localStorage (was logging users out unexpectedly).
- P2-6/8: Refactored finder page — extracted `fetchOverpassTreks` shared helper used by both `searchLocationAndZoom` and `handleMapClick`, eliminating duplicated Overpass query+enhancement logic. `handleMapClick` now uses tags-based safety/popularity + dedupe filter consistently.
- P2-8 (partial): Noted `useEffect` deps on `markers`/`mapCenter` cause refilter on map pan/click — acceptable for now since filtering is client-side and cheap; leaving as-is to avoid behavior change risk.
- Verified: all media assets exist (`image.jpg`, `forest.mp4`, `forest2.mp4`). `theme.ts` deletion safe (no imports). Deleted SVGs not referenced anywhere.
- Verified build: `npm run build` passes (Next.js 16.1.6, all 11 routes prerendered).
