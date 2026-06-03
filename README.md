# Esports Team Tracker v3

React + Django REST Framework + PostgreSQL rewrite of the Esports Team Tracker app.

## Stack

- **Frontend:** React, Vite, React Router, Bootstrap (mobile-first layouts)
- **Backend:** Django 5, Django REST Framework, Simple JWT
- **Database:** PostgreSQL

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL running locally

## Setup

### 1. Database

```bash
createdb estt_v3
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_mario_kart
python manage.py createsuperuser
python manage.py runserver
```

API runs at `http://localhost:8000`.

**Platform admin (staff user):** manages games and activities in Django admin (`/admin/`) or admin API routes. Team members and coaches cannot create catalog entries.

**Seed command:** `seed_mario_kart` loads Mario Kart 8 Deluxe with 48 base tracks plus 48 Booster Course Pass DLC tracks on the same game. DLC tracks are hidden on the grid until toggled on. `seed_mario_kart_dlc` re-runs the DLC portion if you already seeded base only.

**Demo roster (CSV testing):** after you have a team, run `python manage.py seed_demo_roster --list-teams`, then `python manage.py seed_demo_roster --team-id N` to create users `riley`, `casey`, `morgan`, `quinn`, `sam` (password `demo12345`) on that roster. Sample CSV: `backend/fixtures/sample_mk_times.csv`. Then `python manage.py seed_demo_benchmarks --team-id N` for Par 1/Par 2/elite on those six tracks.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`.

## Beta testing

See [docs/BETA.md](docs/BETA.md) for the smoke-test checklist and requests inbox coverage.

## Deployment (beta / production)

### Overview

Typical split hosting:

| Component | Suggestion |
|-----------|------------|
| Frontend | Vercel, Netlify, or Cloudflare Pages |
| Backend | Render, Railway, or Fly.io |
| Database | Managed Postgres (Neon, Supabase, Render, Railway) |

### Backend

1. Set environment variables (see `backend/.env.example`):

   - `DJANGO_SECRET_KEY` — long random string
   - `DEBUG=False`
   - `ALLOWED_HOSTS=your-api.example.com`
   - `CSRF_TRUSTED_ORIGINS=https://your-app.example.com`
   - `CORS_ALLOWED_ORIGINS=https://your-app.example.com`
   - `DB_*` or platform `DATABASE_URL` mapped to `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`

2. Install and migrate:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

3. Run with gunicorn (example):

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

WhiteNoise serves Django admin static files when `DEBUG=False`.

### Frontend

1. Set `VITE_API_URL=https://your-api.example.com` in the host’s build environment.
2. Build and deploy:

```bash
cd frontend
npm install
npm run build
```

Deploy the `frontend/dist/` folder. Configure SPA fallback to `index.html` for client-side routes.

### Post-deploy checks

- [ ] HTTPS on both frontend and API
- [ ] Sign up / sign in works against production API
- [ ] CORS errors absent in browser console
- [ ] Django admin reachable at `/admin/`
- [ ] Run through [docs/BETA.md](docs/BETA.md) smoke tests

## Typical workflow

1. Sign up / sign in
2. Create an organization or **request to join** one with a join code (org leader approves)
3. Org leaders create **teams** (creator becomes head coach)
4. Coach assigns a **game** from the catalog to the team
5. Coach sets **benchmarks** (Par 1, Par 2, elite) per activity
6. Team members **add times**
7. View the **times grid** with color-coded results

## Permissions

| Action | Who |
|---|---|
| Games / activities catalog | Platform admin (`is_staff`) |
| Organizations | Any user (multiple org memberships allowed) |
| Teams, assign games | Org members on a team roster; org leaders create teams |
| Benchmarks | Team coaches |
| Submit times | Competing team members |
| View grids | Team members |

## API highlights

| Method | Path | Description |
|---|---|---|
| GET | `/api/organizations/me/` | All org memberships for current user |
| POST | `/api/organizations/me/` | Create org |
| POST | `/api/organizations/join/` | Request to join org with code |
| GET | `/api/organizations/me/join-requests/` | Your pending org join requests |
| GET | `/api/organizations/{id}/join-requests/` | Org leaders review pending requests |
| POST | `/api/organizations/{id}/leave/` | Leave or disband org |
| POST | `/api/teams/{id}/leave/` | Leave or disband team |
| GET/POST | `/api/teams/` | List/create teams |
| GET/POST | `/api/teams/{id}/games/` | Assign catalog game to team |
| GET | `/api/teams/{id}/games/{game_id}/grid/` | Times grid payload |
| POST | `/api/teams/{id}/benchmarks/` | Coach benchmarks |
| POST | `/api/results/` | Submit a time |
| POST | `/api/teams/{id}/times-csv/` | Coach bulk-upload times from MK-style CSV |
| GET | `/api/teams/{id}/time-history/` | Time submission history for a team |
| POST | `/api/teams/{id}/migration-requests/` | Head coach requests move to org (join code) |
| GET | `/api/organizations/{id}/outgoing-team-migration-requests/` | Source org leader approves team leaving |
| GET | `/api/organizations/{id}/team-migration-requests/` | Target org leader approves team arriving |
| GET | `/api/catalog/games/` | Active games (read-only) |
| POST | `/api/game-suggestions/` | Suggest a new catalog game |
| GET | `/api/admin/game-suggestions/` | Platform admin reviews suggestions |

## Project status

- [x] Phase 0: Project foundation
- [x] Phase 1: Auth
- [x] Phase 2: Orgs, teams, catalog, times grid, benchmarks (MK)
- [x] Step 1: Leave team (head-coach handoff / disband)
- [x] Step 2: Leave org (leader handoff / disband)
- [x] Step 3: Multi-org membership
- [x] Step 4: Team join requests
- [x] Step 5: Team migration to another org (head coach request + source and target org leader approval)
- [x] Phase 3 polish: Compare (3-member), CSV upload
- [x] Phase 4: DLC game pack, game suggestions UI

## Development notes

- Times are stored as milliseconds internally and formatted as `M:SS.mmm` in the API.
- v3 uses a clean Postgres database (`estt_v3`), separate from v2.
- On WSL/Linux with peer auth, leave `DB_HOST=` empty in `backend/.env`.
