# Deploy v3 — Render (API) + Vercel (frontend)

Use this walkthrough if you already deploy with Render + Vercel (same pattern as v2).

Replace placeholder URLs with your real Vercel and Render URLs.

## Overview

| Piece | Host | URL (example) |
|-------|------|----------------|
| React app | Vercel | `https://your-app.vercel.app` |
| Django API | Render | `https://your-api.onrender.com` |
| Postgres | Render | linked to web service |

---

## Part 1 — Render (backend + database)

### 1. Postgres (if you need a new DB for v3)

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Name: `esports-team-tracker-v3-db` (or reuse an existing DB if you prefer)
3. Create → copy **Internal Database URL** (for same-region services) or **External** for local migrations

### 2. Web service (Django API)

1. **New +** → **Web Service**
2. Connect repo: `SscottK/esports-team-tracker-v3`, branch `main`
3. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `./build.sh` |
| **Start Command** | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |

4. **Environment** (minimum):

| Key | Value |
|-----|--------|
| `DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | long random string (Generate in Render) |
| `DATABASE_URL` | link from Postgres (*Add from database*) |
| `ALLOWED_HOSTS` | `your-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://your-app.vercel.app` |
| `SECURE_SSL_REDIRECT` | `True` |

5. Deploy → wait for build (migrate + collectstatic run in `build.sh`)

### 3. First-time data (Shell on Render)

Open the web service → **Shell**:

```bash
python manage.py createsuperuser
python manage.py seed_mario_kart
# optional demo data after you have a team locally or via app
```

### 4. Smoke test API

```bash
curl https://your-api.onrender.com/api/catalog/games/
# Expect 401 without auth — good sign the service is up
```

---

## Part 2 — Vercel (frontend)

### 1. Import project

1. [Vercel Dashboard](https://vercel.com) → **Add New…** → **Project**
2. Import `SscottK/esports-team-tracker-v3`
3. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 2. Environment variable

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://your-api.onrender.com` (no trailing slash) |

Redeploy after setting env vars (Vite bakes `VITE_*` at build time).

### 3. SPA routing

`frontend/vercel.json` rewrites all routes to `index.html` for React Router.

---

## Part 3 — Wire URLs together

After Vercel gives you a production URL:

1. Update Render **CORS_ALLOWED_ORIGINS** and **CSRF_TRUSTED_ORIGINS** with the exact Vercel URL (`https://…`, no trailing slash)
2. Redeploy Render if you changed env vars
3. Redeploy Vercel if you changed `VITE_API_URL`

---

## Part 4 — Verify end-to-end

Use [BETA.md](./BETA.md) smoke checklist. Minimum:

- [ ] Sign up / sign in on Vercel URL
- [ ] Dashboard loads teams
- [ ] No CORS errors in browser devtools → Network
- [ ] Django admin: `https://your-api.onrender.com/admin/`

---

## Updating an existing v2 deployment

If your Render/Vercel services still point at **v2**:

- **Option A:** Create new Render + Vercel projects for v3 (recommended for beta)
- **Option B:** Point existing services at `esports-team-tracker-v3` repo and update root directory / env (downtime risk — use a new Postgres DB for v3)

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
| 400 Bad Request on POST | Add Vercel URL to `CSRF_TRUSTED_ORIGINS` (admin/forms); JWT API usually fine |
| Blank page on refresh | Ensure `vercel.json` rewrites exist |
| 502 on Render | Check logs; often migrate failed or wrong `rootDir` |
| API calls go to localhost | Rebuild Vercel after setting `VITE_API_URL` |
