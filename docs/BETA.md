# Beta testing guide

Use this checklist before inviting coaches and org leaders to a hosted beta.

## Known beta scope

- Mario Kart 8 Deluxe is the primary seeded game (base + DLC tracks).
- Platform admins manage the catalog via Django admin (`/admin/`).
- Times are per team; the same user on two teams has separate histories.

## Requests inbox coverage

The bell badge and `/requests` inbox should surface all reviewable request types:

| Type | Who sees it | Action |
|------|-------------|--------|
| Organization join | Org leader | Approve / Deny |
| Team join | Team coach | Approve / Deny |
| Team move (outgoing) | Source org leader | Approve / Deny |
| Team move (incoming) | Target org leader | Approve / Deny |

Pending count in the nav comes from `GET /api/requests/inbox/` → `pending_count`.

## Smoke test checklist

### Auth & nav
- [ ] Sign up, sign in, sign out
- [ ] Hamburger menu: organizations flyout, teams flyout, add time, suggest game
- [ ] Notification bell shows pending count and links to `/requests`

### Organization flow
- [ ] Create organization (Leader tools: join code, create team)
- [ ] Join organization with code (second user) → leader approves in Requests inbox
- [ ] Org detail: teams list, join team request, leave org (non-leader)

### Team flow
- [ ] Create team, assign game, add roster members (Coach tools)
- [ ] Head coach: inline roster role + Competes toggles on team page
- [ ] Request to join team (org member) → coach approves in Requests inbox

### Times
- [ ] Set benchmarks (Coach tools → Set benchmarks)
- [ ] Add time (member + coach for another member)
- [ ] Upload CSV (coach)
- [ ] Times grid: color coding, DLC toggle, compare (3 members)
- [ ] Time history filters (coach + member)

### Handoff & migration
- [ ] Head coach leave with successor; assistant coach leave
- [ ] Org leader leave with successor
- [ ] Team migration: head coach requests move → both org leaders approve in Requests inbox

### Multi-team / multi-org
- [ ] User in two orgs: both appear in nav
- [ ] Same game on two teams: dashboard team switcher + grid team switcher

### Mobile (phone width)
- [ ] Hamburger nav usable
- [ ] Times grid horizontal scroll
- [ ] Coach tools header buttons wrap
- [ ] Requests inbox Pending / Reviewed tabs

## Beta feedback to collect

- Confusing labels or dead-end pages
- Permission errors that should be clearer
- Layout breaks at your common screen size
- Missing request types in the inbox

## Reporting issues

Note: username, page URL, what you clicked, expected vs actual, and screenshot if possible.
