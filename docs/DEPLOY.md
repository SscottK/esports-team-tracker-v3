# Deploy v3 — Render (API) + Vercel (frontend)

Production deployment for this repo.

## Live URLs

| Piece | URL |
|-------|-----|
| **App (Vercel)** | [https://esports-team-tracker.vercel.app](https://esports-team-tracker.vercel.app) |
| **API (Render)** | [https://esports-team-tracker-v3-api.onrender.com](https://esports-team-tracker-v3-api.onrender.com) |
| **Django admin** | [https://esports-team-tracker-v3-api.onrender.com/admin/](https://esports-team-tracker-v3-api.onrender.com/admin/) |

Repo: `SscottK/esports-team-tracker-v3`, branch `main` (auto-deploy on push).

---

## Overview

| Piece | Host | Root directory |
|-------|------|----------------|
| React app | Vercel | `frontend` |
| Django API | Render | `backend` |
| Postgres | Render | linked to web service |

---

## Part 1 — Render (backend + database)

### 1. Postgres

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Name: e.g. `esports-team-tracker-v3-db`
3. Copy **Internal Database URL** for the web service in the same region

### 2. Web service (Django API)

1. **New +** → **Web Service** → connect `SscottK/esports-team-tracker-v3`
2. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `./build.sh` |
| **Start Command** | `./start.sh` |

3. **Environment** (production example):

| Key | Value |
|-----|--------|
| `DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | long random string |
| `DATABASE_URL` | Internal Postgres URL (must not be blank) |
| `ALLOWED_HOSTS` | `esports-team-tracker-v3-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://esports-team-tracker.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://esports-team-tracker.vercel.app` (API host is added automatically from `ALLOWED_HOSTS`) |
| `SECURE_SSL_REDIRECT` | `True` |

4. Deploy — `build.sh` runs migrations and collectstatic; `start.sh` runs migrations again before gunicorn

### 3. First-time data (Render Shell)

```bash
python manage.py createsuperuser
python manage.py seed_mario_kart
```

### 4. Smoke test API

```bash
curl https://esports-team-tracker-v3-api.onrender.com/api/health/
# {"status":"ok"}
```

---

## Part 2 — Vercel (frontend)

| Field | Value |
|-------|--------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

**Environment:**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://esports-team-tracker-v3-api.onrender.com` (no trailing slash) |

**Render Postgres (production):** use **Basic-256mb** or higher — free databases expire after 30 days.

Redeploy after changing `VITE_*` (baked at build time).

`frontend/vercel.json` rewrites routes to `index.html` for React Router.

---

## Part 3 — Verify end-to-end

Use [BETA.md](./BETA.md). Minimum:

- [ ] Sign up / sign in on [esports-team-tracker.vercel.app](https://esports-team-tracker.vercel.app)
- [ ] No CORS errors in browser devtools → Network
- [ ] Health check responds: `curl https://esports-team-tracker-v3-api.onrender.com/api/health/`

---

## Local production-like check

```bash
# Backend
cd backend
export DEBUG=False
export ALLOWED_HOSTS=localhost,127.0.0.1
export CORS_ALLOWED_ORIGINS=http://localhost:5173
./build.sh
gunicorn config.wsgi:application --bind 127.0.0.1:8000

# Frontend
cd frontend
VITE_API_URL=http://127.0.0.1:8000 npm run build && npm run preview
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error in browser | `CORS_ALLOWED_ORIGINS` must exactly match Vercel origin |
| 400 Bad Request on POST | Add Vercel URL to `CSRF_TRUSTED_ORIGINS` |
| Blank page on refresh | Ensure `vercel.json` rewrites exist |
| 502 on Render | Check logs; often migrate failed or wrong root directory |
| API calls go to localhost | Rebuild Vercel after setting `VITE_API_URL` |
| Empty DATABASE_URL on Render | Delete blank var or paste full Postgres URL |
| Slow first request | Render starter spin-down; frontend shows wake overlay and retries |
| Django admin 500 after login | Check `curl .../api/health/?migrations=1` for pending migrations. Redeploy API (uses `start.sh`). Render logs now include request tracebacks. Staff JWT: `GET /api/health/admin/` for per-model changelist errors. |
