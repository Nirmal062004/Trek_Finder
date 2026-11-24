# Trek Finder — Plan, Actions & Completed Tasks

## Project Overview
Trek Finder is a Next.js (App Router) + Supabase web application for discovering, saving, and sharing hiking trails across India. It includes a map-based trek finder, gallery, chat room, profile with gamification, settings, and an admin dashboard.

## Roles & Function Access

| Role | Accessible Functions |
|------|---------------------|
| **Guest (not logged in)** | Home, Login, Signup |
| **Authenticated User** | Home, Finder, Gallery, Chat, Profile, Settings |
| **Admin** | All user functions + Admin Dashboard (users, treks, communities, stories management) |

## Plan

### Phase 1: Documentation & Flaw Analysis (Current)
- [x] Scan entire project (frontend + backend)
- [x] List all flaws: logic, design, connectivity, churns, UI/UX, functionality, maintainability, user travel flow
- [x] Define role-based function add/remove
- [x] Identify button sizing / responsive issues

### Phase 2: Critical Bug Fixes
- [ ] Fix auth redirect loops (RequireAuth on `/` allows unauthenticated access to home)
- [ ] Fix Finder page: `pendingFilters`/`pendingRadius` never applied unless "Apply Filters" clicked; filters reset confusingly
- [ ] Fix Finder: `fetchTreksFromSupabase` RPC call missing `p_difficulty` and `p_tags` params (commented out)
- [ ] Fix Finder: Overpass/Nominatim external API calls have no fallback UI when offline
- [ ] Fix Chat: WebSocket is simulated (no real backend), messages only in localStorage
- [ ] Fix Settings: `handleClearCache` preserves token but clears everything else — logs user out unexpectedly
- [ ] Fix Admin: `handleBulkDelete` type mapping is fragile (`activeTab.slice(0, -1)`)
- [ ] Fix Gallery: `formFile` type check allows video but accept attr is image-only — inconsistent
- [ ] Fix Profile: `completedTreks` and `savedTreks` only in localStorage, not synced to Supabase

### Phase 3: UI/UX Modernization & Responsiveness
- [ ] Modernize all pages with consistent design system (colors, typography, spacing)
- [ ] Fix button sizes not fitting window size (mobile responsiveness)
- [ ] Add responsive breakpoints to all modules
- [ ] Modernize navigation (mobile drawer, active states)
- [ ] Add loading skeletons, empty states, toast notifications
- [ ] Improve map controls sizing on mobile

### Phase 4: Function Add/Remove by Role
- [ ] Add: Admin-only trek verification/moderation
- [ ] Add: User trek reviews/ratings (1-5 stars) on detail view
- [ ] Add: Real-time chat via Supabase Realtime (replace simulated WebSocket)
- [ ] Remove: Redundant `pendingFilters`/`pendingRadius` — apply filters immediately
- [ ] Remove: Duplicate avatar editor logic across Profile, Chat, Navigation

### Phase 5: Flow Correction
- [ ] Fix auth flow: redirect authenticated users away from login/signup
- [ ] Fix Finder → Profile → Settings navigation flow
- [ ] Fix Gallery contribute flow (currently replaces entire page)
- [ ] Add trek detail page (currently missing — View Route just logs)

### Phase 6: Testing & Validation
- [ ] Run TypeScript type check
- [ ] Run ESLint
- [ ] Verify all pages load without errors
- [ ] Test responsive breakpoints

---

## Completed Tasks
- [x] Project scan completed — all 27 source files reviewed
- [x] Backend schema and edge functions reviewed
- [x] Flaw inventory compiled (see FLAWS.md)
- [x] Created shared design system (Button, Input, Card, Modal, Toast, useAvatar hook)
- [x] Fixed Finder page: removed pendingFilters/pendingRadius two-state pattern
- [x] Fixed Finder page: Supabase RPC now includes p_difficulty and p_tags params
- [x] Fixed Settings page: clear cache preserves auth token
- [x] Fixed Admin page: bulk delete type mapping uses lookup table instead of string slice
- [x] Fixed TypeScript errors (Toast X import, supabaseClient autocompleteSignIn)
- [x] Modernized Login page with shared Button/Input components
- [x] Modernized Signup page with shared Button/Input components
- [x] Fixed button sizing with responsive variants (sm/md/lg, fullWidth)

---

## Action Log
| Date | Action | Owner |
|------|--------|-------|
| 2026-11-24 | Initial project scan and flaw inventory | AI Assistant |
