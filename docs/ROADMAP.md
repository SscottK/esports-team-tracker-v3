# Future features

Planned improvements to investigate and discuss before implementation. Nothing here is committed to a timeline — order may change based on beta feedback.

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
- **Loading states on Requests tabs** — avoid empty Sent/Pending flash while API loads.

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
