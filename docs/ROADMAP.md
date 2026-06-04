# Future features

Planned improvements to investigate and discuss before implementation. Nothing here is committed to a timeline — order may change based on beta feedback.

## High priority (beta polish)

| Item | Status |
|------|--------|
| Admin review pages: Pending / Reviewed tabs | **Done** |
| Requests inbox: in-panel loading (tabs stay visible) | **Done** |
| Requests inbox: human-readable status/type labels | **Done** |
| Beta feedback popup with auto-captured page | **Done** |
| In-app admin panel → Django admin links | **Done** |
| Mobile times grid: header actions wrap, toggles under title | **Done** (partial — team/coach pages still need audit) |
| Update `docs/BETA.md` for one-org beta | **Done** |

### Still open from high-priority pass

- **Mobile layout audit** — shipped; verify on real devices during beta
- **Bulk roster import** — **Done** (bulk team invites by username in Coach tools)
- **Self-serve password reset (email)** — manual staff flow only
- **Remember last times grid game** — **Done**
- **Render cold-start** — paid API + Postgres; overlay kept as deploy fallback
- **Incremental in-app tips** — deferred until beta feedback

---

## Roster & membership

### Bulk roster import (planned)

Upload a list of usernames (CSV or paste) to invite or add many members at once.

**Rules (non-negotiable):**

- Every roster entry must map to a **real user account** (`User` + login).
- Do **not** create placeholder names that are only strings in the database.
- Allowed patterns:
  - Bulk **team invites** for usernames that exist (head coach sends; user accepts in Requests).
  - Bulk lookup of existing usernames already in the org, then assign role / competing status on the team.
  - Optional: bulk **org join codes** or invite flow for users who have signed up but are not in the org yet.
- Reject or skip rows for unknown usernames with a clear report (same as single-user invite today).

**Out of scope:** ghost roster slots, display-only names, or CSV rows that auto-create members without accounts.

---

## Onboarding & help

### Incremental in-app tips (deferred)

Full product tours are **not** planned for the first beta.

**Approach:** add short, contextual hints on first visit to high-friction pages only (e.g. Coach tools, Requests, Times grid), driven by beta confusion — not an all-at-once walkthrough.

Track candidate pages in beta feedback before building.

---

## Reliability & ops

- **Self-serve password reset** — email-based flow (today: user submits request; staff resets in Django admin or `/admin/password-reset-requests`).
- **Render cold start** — paid tier or keep-warm ping if starter spin-down remains painful (today: esports “Powering up the server” overlay + health retry).

---

## Coach workflow

- **Remember last times grid game** — Coach tools “Times grid” and multi-game teams should open the last game viewed, not always the first assigned game.
- **Assistant coaches send invites** — currently head coach only; revisit if needed.
- **Export times** — CSV or summary from grid / time history for sharing outside the app.
- **Season / event tags** — optional grouping for scrims, leagues, or meets.

---

## Times grid & analytics

- **Personal bests / deltas** — show improvement vs last submission or vs Par on the grid.
- **Richer compare** — trends or team-average views beyond the current 3-member compare.
- **Per-team grid preferences** — remember DLC / coach-times toggles per team and game.

---

## Notifications & catalog

- **Email (or push) for key events** — invite received, join approved, password reset handled.
- **Additional seeded games** — expand beyond Mario Kart 8 Deluxe; suggest-game → admin promote flow already exists.

---

## Beta feedback backlog

Add items here as coaches report them:

- _(empty — fill in after beta sessions)_

---

## Recently shipped (admin & feedback UX)

### Admin inbox & review workflow

- Staff bell badge = personal pending + admin queue totals
- `/requests` **Admin Requests** section with per-queue pending counts
- Beta feedback: `reviewed_at` / `reviewed_by`, mark reviewed, Pending / Reviewed tabs
- Game suggestions & password reset admin pages: Pending / Reviewed tabs
- **`/admin`** in-app panel with links to Django admin (users, orgs, teams, games, times, etc.)

### Beta feedback popup

- Footer **Send beta feedback** opens a modal (no separate page navigation required)
- Current page captured automatically from the route when the modal opens
- `/feedback` route kept for direct access

---

## Mobile layout parity (team & coach flows)

### Times grid — shipped

- Searchable track dropdown on mobile
- Header actions wrap on narrow screens
- DLC + coach toggles grouped under the “Track times” title

### Team detail — shipped

- Coach tools in page header (compact actions row)
- Roster manage rows: full-width role select, compete toggle, and history on mobile
- Game links use full panel width on phone

### Coach tools — shipped

- Header actions wrap with larger tap targets
- Form submit / invite / leave buttons full width on mobile
- Pending invite and migration rows stack cleanly

### Compare times — shipped

- DLC/coach toggles grouped with game title (matches times grid)
- Times grid shortcut in header
- **Mobile card view** per track (no horizontal table scroll on phone)
- Desktop keeps scrollable comparison table with sticky track column

### Add time — shipped

- Loading state while team data loads
- 48px form controls and full-width save button on mobile

### Acceptance checklist (mobile ≤ 767px)

- [x] Times grid: toggles grouped under/with “Track times” title
- [x] Times grid: More pages + Coach tools reachable without horizontal overflow
- [x] Team detail: Coach tools in header; roster controls usable one-handed
- [x] Coach tools: forms and actions full width; invite/migration rows stack
- [x] Compare: mobile cards; toggles in section head; grid link in header
- [x] Add time: large inputs and full-width submit
- [x] Verify leaderboard accordion on real device (times grid)
- [ ] Real-device pass after beta feedback

### Team detail & coach flows (audit reference)

| Page | Status |
|------|--------|
| `TeamDetail.jsx` | Shipped — see above |
| `TeamCoachTools.jsx` | Shipped — see above |
| `CompareTimes.jsx` | Shipped — see above |
| `AddTime.jsx` / `AddTimeMenu.jsx` | Shipped — see above |

---

## Recently shipped (mobile times grid)

**Mobile times grid: searchable track picker** — on phone widths, replaced the long scroll of per-track cards with:

- Search field to filter tracks by name / cup / DLC
- Dropdown prompt: **Select a track to see team times**
- One track panel at a time (Pars + member times) after selection

**Files:** `frontend/src/components/TimesGridTable.jsx` (`MobileGridCards`), `frontend/src/App.css`
