# Trek Finder

Trek Finder is a web application to discover, review, and bookmark trekking locations. It combines a Next.js frontend with Supabase backend services (Postgres + Edge Functions) and includes features such as geospatial search, interactive maps, realtime chat, reviews, and bookmarks.

## Features

- Geo-radius search (PostGIS)
- Interactive map views
- Realtime chat using Supabase Realtime
- Reviews and bookmarks
- Supabase Auth for user management

## Tech Stack

- Frontend: Next.js (React)
- Backend: Supabase (Postgres + PostGIS, Edge Functions)
- Maps: Leaflet
- State / API: `@supabase/supabase-js`

## Repository layout

- `Frontend/` — Next.js application and frontend assets
- `Backend/` — Supabase Edge Functions, migrations (`migrations/`), and backend helpers

See `Backend/README.md` and `Frontend/README.md` (if present) for subproject-specific details.

## Getting started

Prerequisites:

- Node.js 18+ (recommended)
- npm or yarn
- A Supabase project (for database, auth, and edge functions)

Quick start (frontend):

1. Open a terminal and change to the frontend folder:

```bash
cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Add environment variables in `Frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the dev server:

```bash
npm run dev
```

The app will be available at http://localhost:3000.

Backend notes:

- Follow `Backend/README.md` to set up the Supabase project, enable PostGIS, run SQL migrations in `Backend/migrations/`, and deploy Edge Functions.

## Scripts

- Frontend: `npm run dev`, `npm run build` (see `Frontend/package.json`)
- Backend: see `Backend/README.md` for CLI and deployment steps

## Contributing

Contributions are welcome. Open an issue or submit a pull request. Please include clear steps to reproduce and test changes.

## License

This project is licensed under MIT. See `Frontend/LICENSE` for details.

## Contact

If you need help, open an issue in this repository.
 
## Git LFS

This repository uses Git Large File Storage (Git LFS) for large media assets (video files). If you plan to clone, contribute, or run the project, please install and enable Git LFS locally before pulling the repository to ensure large files download correctly.

Install and enable Git LFS (one-time):

```bash
git lfs install
```

Fetch LFS objects after cloning (or to ensure local checkout has large files):

```bash
git lfs pull
```

Tracked file patterns include the project's video assets, for example: `Frontend/public/assets/video/*.mp4`.

If you add large media files in the future, track them with:

```bash
git lfs track "Frontend/public/assets/video/*.mp4"
git add .gitattributes
git commit -m "Track video assets with Git LFS"
```
 