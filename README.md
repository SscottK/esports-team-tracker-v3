# Esports Team Tracker v3

React + Django REST Framework + PostgreSQL rewrite of the Esports Team Tracker app.

## Stack

- **Frontend:** React, Vite, React Router, Bootstrap
- **Backend:** Django 5, Django REST Framework, Simple JWT
- **Database:** PostgreSQL

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL running locally

## Setup

### 1. Database

Create a fresh local database (Unix socket auth on Linux/WSL):

```bash
createdb estt_v3
```

If your Postgres requires a password over TCP, set `DB_HOST=localhost` and `DB_PASSWORD` in `backend/.env`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

API runs at `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`.

## API endpoints (Phase 1)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health/` | Health check |
| POST | `/api/auth/register/` | Create account |
| POST | `/api/auth/login/` | JWT login |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET/PATCH | `/api/auth/me/` | Current user profile |

## Project status

- [x] Phase 0: Project foundation
- [x] Phase 1: Auth (register, login, me)
- [ ] Phase 2: Teams, games, times
- [ ] Phase 3: Permissions and org features
- [ ] Phase 4: Tables, compare, uploads

## Development notes

- v2 remains the reference for domain models and workflows.
- v3 uses a clean Postgres database (`estt_v3`), separate from v2.
