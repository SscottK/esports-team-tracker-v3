# Esports Team Tracker v3

React + Django REST Framework + PostgreSQL rewrite of the Esports Team Tracker app.

**Live app:** [https://esports-team-tracker.vercel.app](https://esports-team-tracker.vercel.app)  
**API:** [https://esports-team-tracker-v3-api.onrender.com](https://esports-team-tracker-v3-api.onrender.com)

## Stack

- **Frontend:** React, Vite, React Router, Bootstrap (mobile-first layouts)
- **Backend:** Django 5, Django REST Framework, Simple JWT
- **Database:** PostgreSQL
- **Hosting:** Vercel (frontend) + Render starter (API + Postgres)

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/BETA.md](docs/BETA.md) | Beta smoke-test checklist and inbox coverage |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Render + Vercel deployment |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planned future features |

## Prerequisites (local dev)

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

**Platform admin (`is_staff`):** Django admin at `/admin/`, in-app **Game suggestions**, and **Password reset requests** (hamburger menu). Coaches cannot edit the game catalog.

**Seed command:** `seed_mario_kart` loads Mario Kart 8 Deluxe (base + Booster Course Pass DLC tracks). DLC is hidden on the grid until toggled on.

**Demo roster (dev/CSV testing only):** `python manage.py seed_demo_roster --team-id N` creates real user accounts (`riley`, `casey`, …). Sample times CSV: `backend/fixtures/sample_mk_times.csv`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`. Set `VITE_API_URL=http://localhost:8000` in `frontend/.env`.

## Typical workflow

1. Sign up / sign in at [the live app](https://esports-team-tracker.vercel.app) or locally
2. Create an organization or **request to join** with a join code (org leader approves in **Requests**)
3. Org leaders create **teams** in Leader tools (creator becomes head coach)
4. Head coach assigns a **game**, sets **team colors**, and builds the roster:
   - Add existing org members by username, or
   - **Invite** users by username (they accept in Requests; cross-org accept requires leaving the other org first)
5. Coach sets **benchmarks** (Par 1, Par 2, elite)
6. Competing members **add times** or coach **uploads CSV** (times only — roster must exist first)
7. View the **times grid**, leaderboard, compare, and time history  
   Coaches with multiple org teams on the same game can toggle **Show all teams in organization** on the grid to compare every player across teams (e.g. Varsity vs JV).

All roster members are **real user accounts** — there are no display-only name slots.

## Requests inbox

Three tabs at `/requests`:

- **Pending** — items waiting on you (approve, deny, accept, decline)
- **Sent** — org joins, team joins, invites, team moves, and password reset requests you submitted (cancel while pending)
- **Reviewed** — items you already handled

Nav bell count = incoming **Pending** only.

## Permissions (summary)

| Action | Who |
|--------|-----|
| Games / activities catalog | Platform admin (`is_staff`) |
| Organizations | One org per user; leave before create/join another |
| Create teams | Org leaders |
| Coach tools, benchmarks, CSV times | Team coaches |
| Team invites, team colors | Head coach |
| Submit times | Competing team members |
| View grids / history | Team members |
| Org-wide grid (all org teams, same game) | Coaches on any org team with that game |

## API highlights

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/` | Health check (used for cold-start wake) |
| GET | `/api/requests/inbox/` | Pending, sent, and reviewed request items |
| POST | `/api/auth/password-reset-requests/` | Request manual password reset |
| GET/PATCH | `/api/admin/password-reset-requests/` | Staff review password resets |
| GET | `/api/organizations/me/` | Current user's org memberships |
| POST | `/api/organizations/join/` | Request to join org with code |
| GET/POST | `/api/teams/` | List / create teams |
| POST | `/api/teams/{id}/invites/` | Head coach invite by username |
| PATCH | `/api/teams/{id}/invites/{id}/` | Accept / decline / cancel invite |
| POST | `/api/teams/{id}/join-requests/` | Request to join team |
| GET | `/api/teams/{id}/games/{game_id}/grid/` | Times grid (`?org_view=true` for coach org rollup) |
| POST | `/api/teams/{id}/times-csv/` | Coach bulk-upload times (MK-style CSV) |
| PATCH | `/api/teams/{id}/` | Head coach team colors |
| POST | `/api/game-suggestions/` | Suggest a catalog game |

Full route list lives in `backend/config/api_urls.py` and `backend/accounts/urls.py`.

## Project status

**Shipped for beta**

- Auth (sign up, sign in, JWT refresh)
- Orgs, teams, multi-org membership, leave / handoff / disband
- Team join requests and head-coach **team + org invites**
- Team migration between orgs (dual org-leader approval)
- Times grid, org-wide coach grid toggle, benchmarks, compare, time history, CSV time upload
- Requests inbox (Pending / **Sent** / Reviewed)
- Coach tools, team colors, dark/light mode, team-themed UI
- Game suggestions (user → staff admin)
- Manual password reset requests
- Render cold-start **server wake** overlay on frontend

**Planned** — see [docs/ROADMAP.md](docs/ROADMAP.md) (bulk roster import with real accounts, incremental in-app tips, etc.)

## Development notes

- Times are stored as milliseconds internally; API formats as `M:SS.mmm`.
- v3 uses Postgres database `estt_v3`, separate from v2.
- On WSL/Linux with peer auth, leave `DB_HOST=` empty in `backend/.env`.
- Render starter tier may spin down the API; the frontend polls `/api/health/` and shows a startup overlay.
