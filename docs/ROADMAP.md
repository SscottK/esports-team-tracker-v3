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

---

## Admin inbox & review workflow (planned — next session)

Work queued from beta admin UX review (2026-06-02).

### Admin notification bell

When the signed-in user is **staff** (`is_staff`), the header bell badge should reflect **unreviewed admin work**, not only the personal Requests inbox:

| Source | Count when |
|--------|------------|
| Beta feedback | Unreviewed submissions |
| Password reset requests | Pending (not completed/rejected) |
| Game suggestions | Pending (not yet promoted/dismissed) |

- Badge total = sum of pending admin items (define whether to merge with personal `pending_count` or show admin-only count for staff — likely **admin queue only** on bell for staff, or combined with clear semantics).
- Bell still links to `/requests` for personal inbox; admin shortcuts may live there too (see below).

### Admin shortcuts on Requests page

On `/requests`, if user is staff, show buttons (or a small admin section) to jump to:

- `/admin/beta-feedback`
- `/admin/password-reset-requests`
- `/admin/game-suggestions`

So admins can reach review pages without opening the hamburger menu.

### Reviewed tab for admin review queues

Admin review types should follow the same **Pending / Reviewed** pattern as the main Requests inbox:

- **Game suggestions** — after staff acts, item moves off the main list into **Reviewed** (not deleted from the page).
- **Password reset requests** — already has `show_reviewed` on the admin API; align UI with a **Reviewed** tab on that page (today: toggle checkbox).
- **Beta feedback** — add `reviewed` (or `status`) on the model + API; staff can flag as reviewed; reviewed items appear under **Reviewed**, not the main list.

Backend likely needs: `BetaFeedback.reviewed_at`, `reviewed_by`, migration, PATCH endpoint for staff (mirror password reset / game suggestion patterns).

### Beta feedback list UI (sleek, like Requests)

Match the Requests inbox card style (reference: Sent tab — name + badges on line 1, detail + timestamp on following lines).

**Target layout per item:**

```
Line 1:  {username}   {page badge}   {date/time}   [Mark reviewed button if pending]
Line 2:  {feedback message body}
```

- Username, page, and date/time on **one line** (muted secondary text / badges like “Team invite”).
- Full feedback text on the **line below**.
- Optional **Reviewed** badge when done.
- Consider Pending / Reviewed tabs on `/admin/beta-feedback` like Requests.

### Files likely touched (implementation notes)

- `backend/accounts/models.py` — `BetaFeedback` reviewed fields + migration
- `backend/accounts/views.py` — list filter + PATCH review
- `backend/config/inbox_views.py` or new admin counts endpoint for bell badge
- `frontend/src/context/NavContext.jsx` — staff pending admin count
- `frontend/src/components/AppNavBar.jsx` — bell badge source
- `frontend/src/pages/RequestsInbox.jsx` — admin shortcut buttons
- `frontend/src/pages/ManageBetaFeedback.jsx` — tabs, review action, layout
- `frontend/src/pages/ManageGameSuggestions.jsx` / `ManagePasswordResetRequests.jsx` — Reviewed tab consistency
- `frontend/src/App.css` — reuse inbox row styles where possible

---

## Bug fixes (planned — next session)

### Requests inbox: raw `team_invite` label on mobile (Reviewed tab)

On mobile, a reviewed request’s type badge shows **`team_invite`** (snake_case) instead of **Team invite**.

**Likely cause:** type/status badge falling through to the raw API value (`requestTypeLabel` / `statusBadge` fallback), or mobile layout making the wrong badge read as the type label.

**Fix:**

- Audit `RequestsInbox.jsx` — ensure every inbox `type` and `status` value maps to a human label (no raw snake_case in badges).
- Confirm Reviewed-tab team-invite rows (invitee accept/decline) use **Team invite** on all breakpoints.
- Add shared label helpers if needed (`requestTypeLabel`, `requestStatusLabel`) and reuse on Sent / Pending / Reviewed.
- Quick mobile pass after fix (narrow viewport + Reviewed tab with a declined invite).

---

## Mobile layout parity (planned — next session)

Desktop polish from recent betas is not fully reflected on phone-width layouts. Do a focused mobile pass on team/coach/times flows.

### Times grid (`/teams/:teamId/games/:gameId`)

**Shipped:** searchable track dropdown for mobile grid — see [Recently shipped (mobile times grid)](#recently-shipped-mobile-times-grid).

**Still missing or broken vs desktop:**

- **Page header actions** — “More pages” menu, Coach tools shortcut, Back (see `TimesGrid.jsx` + `page-header-actions--compact`).
- **Leaderboard accordion** — collapsible “Click to see leaderboard” panel (`times-grid-accordion`); confirm it renders and is usable on mobile, not hidden or clipped.
- **Team switcher** — multi-team same-game dropdown should remain readable on narrow screens.

**Toggle placement (explicit ask):**

- DLC + coach-time toggles must sit **with the “Track times” section title** above the grid (same visual group as desktop), not dropped below the title or separated on mobile.
- Today: `.times-grid-section-head-row` wraps on narrow viewports and `.times-grid-section-toggles` is column-only below `768px` — rework so title + toggles read as one header row/block on mobile (stack toggles under the title if needed, but keep them in the section head, not below the meta paragraph or grid cards).

**Files:** `TimesGrid.jsx`, `TimesGridTable.jsx` / `MobileGridCards`, `App.css` (`.times-grid-section-head*`, `.page-header-actions*`).

### Team detail & coach flows (audit)

Walk other team pages for the same gap — desktop got new buttons/panels that mobile CSS may not expose:

| Page | Check |
|------|--------|
| `TeamDetail.jsx` | Coach tools button, roster role/compete controls, games list |
| `TeamCoachTools.jsx` | More pages menu, Times grid shortcut, action button row |
| `CompareTimes.jsx` | Header actions, DLC/coach toggles |
| `AddTimeMenu.jsx` / `AddTime.jsx` | Header layout |

### Acceptance checklist (mobile ≤ 640px)

- [ ] Times grid: leaderboard accordion visible and tappable
- [ ] Times grid: More pages + Coach tools reachable without horizontal overflow
- [ ] Times grid: toggles grouped under/with “Track times” title
- [ ] Team detail + coach tools: same shortcuts/buttons as desktop where applicable
- [ ] No raw layout regressions (buttons off-screen, nowrap overflow)

Update `docs/BETA.md` mobile smoke-test section after fixes land.

---

## Recently shipped (mobile times grid)

**Mobile times grid: searchable track picker** — on phone widths, replaced the long scroll of per-track cards with:

- Search field to filter tracks by name / cup / DLC
- Dropdown prompt: **Select a track to see team times**
- One track panel at a time (Pars + member times) after selection

**Files:** `frontend/src/components/TimesGridTable.jsx` (`MobileGridCards`), `frontend/src/App.css`

Remaining mobile parity items are still under [Mobile layout parity](#mobile-layout-parity-planned--next-session) below.

