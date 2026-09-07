# Slice 4 grouping + prior-slice CUA report

Date: 2026-09-07 (America/Toronto)

Base URL: `https://mckeesecurity.ca`

Viewports: 390px, ~1440px

Accounts used:
- Staff: `brenden255@gmail.com`
- Client: `brendenmckee255@gmail.com` (operator-assisted Google sign-in)

## Summary

- Pass / fail / skip counts: **pass 40+ checks · fail 2 (naming) · skip 1 (optional throwaway) · not-built skips as expected**
- Blockers: **none** (GO LIVE left off; McKee sites intact; no House/Bunkie Accept merge; client did not see staff KPIs; House writes stayed read-only; Alerts did not list Off-Test sites; Grouping empty did not crash; empty-queue sign-off worked; House re-enable succeeded)
- Non-blockers:
  - Fixture site label for CODE `O5985` renders as **Brenden McKee** instead of **Bunkie** in Clients list and Account sibling links
  - At 390px, the admin tab strip is horizontally scrollable (page body itself does not overflow)

## Findings

### F1. O5985 labeled “Brenden McKee” instead of “Bunkie”

- Part / step: Part 2 · Clients search + Account sibling links
- URL: `https://mckeesecurity.ca/admin-dashboard?tab=clients` and client Account cards
- Viewport: ~1440px
- What you did: Searched `McKee`, `O5985`, `O4964`; opened Account cards for both sites
- Expected: McKee pair shows **House** and **Bunkie**; `O5985` finds Bunkie
- Actual: Pair shows **House McKee** and **Brenden McKee**; `O5985` resolves to Brenden McKee; sibling link from House also says Brenden McKee. Account still shows `McKee · 2 sites` and sky-highlight for the open site / CODE
- Console / network: no red console errors; no `/admin-dashboard` or `/api/` 4xx/5xx observed
- Screenshot: see Part 2 Clients / Account captures from the run (Bunkie Account card at 390px retained as `…/shot-call_48bRZAObM6Uuy1mDGa5ziaBEfc_0085d27bb54b54a4.png`)

### F2. (Resolved on retest) Staff wrong-door needs the staff Google session

- Part / step: Part 5 · staff session on `/user-dashboard`
- URL: `https://mckeesecurity.ca/user-dashboard`
- Viewport: ~1440px
- What you did: First attempt after client Google was active auto-authenticated the client; later retest with staff `brenden255@gmail.com` signed in
- Expected: Administrator frame + Sign out / staff link
- Actual: **PASS on retest** with staff session — “You are an administrator” + staff-console link. Earlier client-session attempt showed client Welcome portal (test setup / active Google account), not a product fail once staff was signed in
- Console / network: clean
- Screenshot: `/tmp/.sand-browser/shot-call_1PekwVjatxSD6NEs2Lf5IvnHfc_0792bf117f3ebfe7.png`

## Log

- Part 1 reachability / mail: **pass**
  - Logged-out `/user-dashboard` and `/admin-dashboard`: sign-in only, no data/KPIs
  - Staff Google OK; amber **CLIENT EMAIL PAUSED**; Billing mail left off; Grouping link present; GO LIVE not entered
- Part 2 Clients / Account / Alerts: **pass with F1 naming fails**
  - Linked-accounts filter, amber + Clear filters: pass
  - New client / Add site separate toggles: pass
  - 390px Clients stacked cards, no page overflow: pass
  - Bunkie/House Account cards, auto-onboard toggle+restore, add-site prefill closed, Account admin no Revoke, Delete cancel copy: pass
  - House Disable → Bunkie still opens → Re-enable House: pass (House left **ACTIVE**)
  - House Security read-only / writes-not-live note: pass; no On Test
  - Bunkie Security reads only: pass
  - Alerts empty / no stale on-test sites; links not generic “Open site”: pass
  - Optional throwaway @example.com flow: **skip**
- Part 3 Grouping empty + sign-off: **pass**
  - Title Possible linked accounts; badge `0`; empty queue (McKee not suggested)
  - Sign off grouping confirmed; green card timestamp `2026-09-07, 7:31:58 a.m.`; client email stayed paused
  - 390px: pass
- Part 4 client Bunkie (no switcher expected): **pass**
  - After operator Google for `brendenmckee255@gmail.com`
  - One-site chrome (no switcher / sites list / People with access): pass
  - No House/O4964 bleed; not staff console: pass
  - Tabs Dashboard (billing-first) / Security / Settings / Alerts: pass
  - Settings email locked: pass
  - Security Bunkie-labeled zones/events/caller list, read-only: pass
  - Stripe Add Card sandbox opened then cancelled: pass
  - Client on `/admin-dashboard` → “You are a client” + link back: pass
  - Sign out → sign-in: pass
- Part 5 wrong-door / 390px: **pass**
  - Staff on `/user-dashboard` → administrator frame: pass (retest)
  - 390px Clients, Grouping, Billing, Alerts, Bunkie/O5985 Account, House Security (read-only note): no document horizontal overflow; tab strip scrolls horizontally by design
  - House left enabled; no On Test left on; still staff at end

## Hard-stop compliance

- GO LIVE / client email: left paused
- McKee House / Bunkie: not deleted
- McKee Account admin: not revoked
- QuickBooks / Lanvac fullupdate: not started
- Grouping Accept of McKee or production names: not done
- No real-customer mail sent; invites held as designed
- O5985 not left on test; House not left disabled

## Console / network (run-wide)

- Console: no application red errors noted (occasional CSS preload warnings / DevTools “possible improvements” only)
- Network: repeated `status-code:>=400` filters showed **0** matching requests on sampled pages (including billing, clients, grouping, client portal, Part 5 sweep)
