# Beta testing guide

Use this checklist before inviting coaches and org leaders to the hosted beta.

**Live app:** [https://esports-team-tracker.vercel.app](https://esports-team-tracker.vercel.app)  
**API:** [https://esports-team-tracker-v3-api.onrender.com](https://esports-team-tracker-v3-api.onrender.com)

Deploy details: [DEPLOY.md](./DEPLOY.md) · Future work: [ROADMAP.md](./ROADMAP.md)

## Known beta scope

- Mario Kart 8 Deluxe is the primary seeded game (base + DLC tracks).
- Platform admins manage the catalog via Django admin (`/admin/`) or in-app **Game suggestions**, **Password reset requests**, and **Beta feedback** (staff menu).
- Times are per team; the same user on two teams has separate histories.
- Every team member is a **real user account** — roster is not display-only names.
- One org per user; leave before joining another org
- Render **starter** tier may sleep the API; first load can take up to ~1 minute (startup overlay + retry).

## Requests inbox coverage

The bell badge and `/requests` inbox use three tabs: **Pending**, **Sent**, and **Reviewed**.

`pending_count` in the nav counts **incoming** items only (not Sent).

| Type | Pending (incoming) | Sent (outgoing) | Who acts |
|------|-------------------|-----------------|----------|
| Organization join | Org leader | Requester | Approve / Deny or Cancel |
| Team join | Team coach | Requester | Approve / Deny or Cancel |
| Team invite | Invitee | Head coach (sender) | Accept / Decline or Cancel |
| Team move (outgoing) | Source org leader | Head coach (requester) | Approve / Deny or Cancel |
| Team move (incoming) | Target org leader | Head coach (requester) | Approve / Deny |
| Password reset | — | Requester | Staff handles in admin; user sees status in Sent |

Team invite accept rules: user not in any org → join org + team; same org → team only; **different org → must leave current org first**, then accept.

## Smoke test checklist

### Auth & nav
- [ ] Sign up, sign in, sign out
- [ ] Forgot password → request appears in Sent; staff can handle via admin
- [ ] Hamburger menu: organizations, teams, add time, suggest game
- [ ] Staff menu: game suggestions, password reset requests, beta feedback (if `is_staff`)
- [ ] Notification bell → `/requests`
- [ ] Dark / light mode toggle in header

### Cold start (Render starter)
- [ ] After idle period, first visit shows “Powering up the server” overlay
- [ ] App recovers without manual refresh once API is up

### Organization flow
- [ ] Create organization (Leader tools: join code, create team)
- [ ] Join organization with code (second user) → leader approves in Requests → Pending
- [ ] Org detail: teams list, join team request, leave org (non-leader)

### Team flow
- [ ] Create team, assign game, add roster by username (user must exist + be in org)
- [ ] Head coach: **Invite to team** in Coach tools; invitee accepts in Pending; sender sees in **Sent**
- [ ] Head coach: **Team colors** page from Coach tools
- [ ] Head coach: inline roster role + Competes toggles on team page
- [ ] Request to join team (org member) → coach approves in Pending

### Times
- [ ] Set benchmarks (Coach tools → More pages → Set benchmarks)
- [ ] Add time (member + coach for another member)
- [ ] Upload CSV (coach) — times only; usernames must already be on roster
- [ ] Times grid: color coding, toggles on Tracks times row, leaderboard accordion, compare
- [ ] Coach tools / grid: **Times grid** shortcut back to grid
- [ ] Time history filters (coach + member)

### Handoff & migration
- [ ] Head coach leave with successor; assistant coach leave
- [ ] Org leader leave with successor
- [ ] Team migration: head coach requests move → both org leaders approve

### Multi-team
- [ ] Same game on two teams: dashboard team switcher + grid team switcher

### Mobile (phone width)
- [ ] Hamburger nav usable
- [ ] Times grid: searchable track picker + toggles under title
- [ ] Coach tools / grid: More pages menu + key buttons wrap on narrow screens
- [ ] Requests inbox: Pending / Sent / Reviewed tabs
- [ ] Admin Requests section with pending badges (staff)
- [ ] Beta feedback popup from footer captures current page

## Beta feedback to collect

- Confusing labels or dead-end pages
- Permission errors that should be clearer
- Layout breaks at your common screen size
- Missing request types in the inbox
- Pages that need a first-visit hint (see [ROADMAP.md](./ROADMAP.md))

## Reporting issues

Signed-in testers can use **Send beta feedback** in the page footer (`Beta v0.1.0`) — a popup opens and the current page is captured automatically. Staff review submissions at `/admin/beta-feedback`.

Also note when reporting elsewhere: username, page URL, what you clicked, expected vs actual, and screenshot if possible.
