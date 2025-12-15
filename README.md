# MyJobMap

Map‑first job search workspace: search roles, see them on an interactive map, compare commutes, track applications, and collaborate with groups — all backed by Supabase.

## Features

- **Job search workspace**
  - Search jobs by role and US location (state/city or ZIP).
  - Filter by remote/onsite/hybrid, job type, experience level, salary, and benefits hints.
  - View results as a list or directly on the map with colored pins.
  - Heatmap view to see where jobs cluster geographically.

- **Commute & map tools**
  - Set a reusable “home” location (stored in localStorage and optionally in your profile).
  - Calculate route distance and travel time for a selected job using OpenRouteService.
  - Visualize routes and compare multiple commutes side‑by‑side.

- **Saved jobs & application tracking**
  - Save jobs to your Supabase `saved_jobs` table.
  - Track application status (not applied, applied, interview, offer, rejected).
  - Dashboard view with recent activity, status breakdowns, and recent searches.

- **Groups & collaboration**
  - Create groups to share jobs and saved searches (`groups`, `group_members`, `group_jobs`, `group_search_presets` tables).
  - Group detail views show shared jobs, presets, and member info.

- **Transit & context data**
  - Supabase Edge Function `sync-transitland` pulls stops, live departures, and alerts from Transitland into `transit_stops`, `transit_departures_live`, and `transit_alerts_live`.
  - Designed so the UI can surface nearby transit context alongside jobs.

- **Auth**
  - Supabase Auth with OAuth providers (Google, GitHub, LinkedIn OIDC).
  - Login page at `/login`, authenticated workspace under `/app`.

## Tech stack

- **Framework**: Next.js App Router (`app/`) with React.
- **Styling**: Tailwind CSS v4, custom components under `components/ui`.
- **Database & auth**: Supabase (Postgres, RLS, OAuth).
- **Maps**: MapLibre / mapbox‑style GL (`maplibre-gl`, `maplibre-react-components`) and custom map components.
- **Data services**:
  - Job data via an external JobSpy‑compatible API.
  - Geocoding with a Nominatim‑compatible API.
  - Routing with OpenRouteService.
  - Transit data via Transitland (Supabase Edge Function in `supabase/functions/sync-transitland`).

## Local development

Prerequisites:

- Node.js 20+ (to match Next 16 / React 19).
- A Supabase project with the expected tables (see below).
- API keys for JobSpy, OpenRouteService, Transitland, and a Nominatim‑compatible geocoder.

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

The app is configured via `.env.local` (for Next) and `supabase/.env` (for Edge Functions). Never commit real keys.

**Next.js / app runtime (`.env.local`)**

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon public key.
- `NEXT_PUBLIC_SITE_URL` – Base URL of the site (e.g. `http://localhost:3000`).
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key used by server‑side admin client (keep secret).
- `JOBSPY_API_URL` – Base URL of the JobSpy‑compatible job scraping API (e.g. `http://host:8000`).
- `GEOCODER_API_URL` – Nominatim‑compatible endpoint used for geocoding.
- `GEOCODER_USER_AGENT` – User‑Agent string for geocoder requests.
- `GEOCODER_EMAIL` – Contact email for geocoder requests.
- `OPENROUTESERVICE_API_KEY` – API key for OpenRouteService routing.
- `TRANSITLAND_API_KEY` – API key for Transitland v2 REST.

**Supabase Edge Functions (`supabase/.env` and function env)**

- `SUPABASE_URL` / `PROJECT_URL` – Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` / `SERVICE_ROLE_KEY` – Service role key (server‑side only).
- `TRANSITLAND_API_KEY` – Transitland API key for `sync-transitland`.

Make sure these env vars are configured both locally and in your deployment platform (e.g. Vercel + Supabase).

## Supabase setup

This project assumes a Supabase Postgres schema with (at least) the following tables:

- `profiles` – per‑user profile data (e.g. `full_name`, `default_location`).
- `jobs` – normalized job listings with location, salary, and metadata.
- `saved_jobs` – many‑to‑one saved jobs for each user, plus application status and timestamps.
- `job_searches` – optional audit/analytics of recent searches.
- `groups`, `group_members`, `group_jobs`, `group_search_presets` – for collaboration and shared presets.
- `locations` – cached geocoding results (`city`, `state`, `country`, `latitude`, `longitude`).
- `transit_stops`, `transit_departures_live`, `transit_alerts_live` – populated by the Transitland sync function.

You can infer exact column shapes from the server components and API routes under `app/` and `app/api/`. Align your SQL schema accordingly, and apply RLS policies that match your security needs.

### Auth configuration

In the Supabase dashboard:

- Enable OAuth providers you want to support (Google, GitHub, LinkedIn OIDC).
- Configure redirect URLs to include:
  - `http://localhost:3000/auth/callback`
  - Your production callback (e.g. `https://your-domain.com/auth/callback`)

The login page (`app/login/page.tsx`) uses Supabase client auth and redirects to `/app` after successful sign‑in.

### Edge function: `sync-transitland`

The Deno function at `supabase/functions/sync-transitland/index.ts`:

- Fetches stops, departures, and alerts from Transitland for configured regions.
- Clears and repopulates `transit_departures_live` and `transit_alerts_live`.
- Upserts stops into `transit_stops` keyed by `onestop_id`.

Typical workflow with the Supabase CLI:

```bash
cd supabase
supabase functions deploy sync-transitland
supabase functions list
```

Then configure a scheduled task (Supabase cron or an external scheduler) to call the function’s HTTP endpoint with `POST`.

## Key app routes

- `/` – Marketing / landing page.
- `/login` – Supabase OAuth login.
- `/app` – Main job map workspace (`JobMapWorkspace`).
- `/app/dashboard` – Application stats dashboard.
- `/app/saved-jobs` – Saved jobs and status management.
- `/app/preferences` – Profile and default location preferences.
- `/app/groups` – Groups overview.
- `/app/groups/[id]` – Group detail, shared jobs, presets.

## API routes (Next.js)

Under `app/api/`:

- `/api/search-jobs` – Search jobs via JobSpy and cache into `jobs`.
- `/api/job-heatmap` – Aggregate job locations for heatmap view.
- `/api/distance` – Compute route distance and duration via OpenRouteService.
- `/api/save-job` / `/api/remove-saved-job` – Manage `saved_jobs`.
- `/api/my-saved-jobs` – Return jobs saved by the current user.
- `/api/job-keywords` – Suggest popular titles from `jobs`.

## Scripts

Defined in `package.json`:

- `npm run dev` – Start Next.js dev server.
- `npm run build` – Build for production.
- `npm run start` – Start production server.
- `npm run lint` – Run ESLint.

## Deployment

- Deploy the Next.js app (e.g. Vercel) and point it at your Supabase project by configuring the same env vars used in `.env.local`.
- Deploy the `sync-transitland` Supabase function and configure its env vars using the Supabase dashboard or CLI.
- Ensure OAuth redirect URLs and CORS settings are aligned across your hosting provider and Supabase.

Once configured, `MyJobMap` provides an end‑to‑end job search companion: find roles, explore them on a map, understand commutes and nearby transit, and track your progress over time.
