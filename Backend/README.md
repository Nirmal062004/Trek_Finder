# Trekk Finder — Serverless Backend (Supabase)

This folder contains SQL migrations and Supabase Edge Functions (Deno) implementing:
- Geo-radius search (PostGIS RPC)
- Reviews & bookmarks (RLS-protected)
- Realtime chat (messages table + Realtime)

Quick deploy checklist

1. Set up a Supabase project and enable PostGIS extension.
2. Run the migration SQL in `Backend/migrations/001_init.sql` (via psql, supabase SQL editor, or supabase-cli).
3. Configure environment variables for Edge Functions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_PROJECT_REF` (for CLI deploys)
   - `SUPABASE_ACCESS_TOKEN` (GitHub Actions token)
   - `SUPABASE_DB_URL` (Postgres connection string used by CI to run migrations)

4. Deploy Edge Functions (example using `supabase` CLI):

```
supabase login
supabase link --project-ref <your-project-ref>
supabase db reset --confirm  # optional; be careful
# Run the SQL in migrations/001_init.sql via supabase SQL editor or psql

# Deploy functions: run from Backend/functions folder
cd Backend/functions
supabase functions deploy search --no-verify
supabase functions deploy review --no-verify
supabase functions deploy bookmark --no-verify
supabase functions deploy chat --no-verify
```

Notes
- The SQL file creates RLS policies that require authenticated users for mutating actions.
- `search_treks` is an RPC function using `ST_DWithin` and GiST index for fast radius queries.
- Chat uses the `messages` table — Supabase Realtime will stream inserts to subscribed clients.
- The Edge Functions verify JWTs (via `serviceAdmin.auth.getUser(token)`) before performing inserts.

CI / GitHub Actions

We added a workflow at `.github/workflows/deploy-backend.yml` that expects these GitHub secrets:

- `SUPABASE_ACCESS_TOKEN` — a personal access token for the supabase CLI (store in Actions > Secrets)
- `SUPABASE_PROJECT_REF` — your Supabase project ref
- `SUPABASE_DB_URL` — Postgres connection URL (can include the service_role key) used to run `psql` against your DB to execute `Backend/migrations/001_init.sql`.

The workflow will:

- Install `supabase` CLI and `psql` client
- Run the SQL migration file via `psql` against `SUPABASE_DB_URL`
- Deploy Edge Functions from `Backend/functions` using `supabase functions deploy`


Security
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server/deployment secrets — never expose it to clients.
- The functions perform server-side token verification to avoid privilege escalation.
