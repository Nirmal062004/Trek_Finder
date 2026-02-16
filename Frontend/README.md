# Trek Finder — Frontend

This repository contains the Trek Finder Next.js frontend.

Quick start

```bash
npm install --legacy-peer-deps
npm run dev
```

Before you push to GitHub

- Ensure `.gitignore` is present (already added).
- Add your Supabase environment variables to `.env.local` (do NOT commit `.env` files).
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Add real media files under `public/assets/img` and `public/assets/video`.

Asset checklist

- The app expects image paths like `/assets/img/image.jpg` and multiple videos under `/assets/video/` referenced in the gallery. Use the `npm run check-assets` helper to list any missing files.

Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run check-assets` — verify referenced image/video files exist (helper script)

License

This project is licensed under the MIT License — see `LICENSE`.
