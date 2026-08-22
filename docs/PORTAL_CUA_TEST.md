# Portal CUA test playbook

**Living document.** Update this file in the same work as each implementation slice. When a button, URL, tab, copy, or empty state changes, change the matching step here in that commit. Do not leave the playbook describing a screen that no longer exists. The computer-using agent must run the version that matches the deployed build.

Run this **after** the Lanvac station layer (R54) and multi-site accounts (R53) are implemented and deployed, and **before** the Windows QuickBooks bridge or any real client import. Include the station cards (zones, Historic, panel chip, on-test) on a monitoring test site. Never put a real customer on test. `O5985` only if a write sitting is in the brief.

You are a computer-using agent. Drive the real web app in a browser with developer tools open. Follow every suite in order. After each step, check the expected result. If it fails, record a finding and continue unless a hard stop says otherwise.

Do not invent features. If a control from a later suite is missing, that is a fail for that suite, not a reason to skip the rest.

## Hard stops

Stop the run and report immediately if any of these happen:

- The URL is the live marketing site and you are about to type `GO LIVE` on the Billing tab. **Never type GO LIVE.**
- You are asked to sign in as a real customer (not a `@example.com` / staff test account).
- A dialog would send mail to anyone who is not a documented test inbox.
- You are about to start `qb-bridge`, change the company file, or trigger a Lanvac `fullupdate`.
- The app is not the portal under test (wrong host, WordPress, or a stale tab).

Client-facing portal mail must stay **paused**. The amber “client email is held” banner on the admin console is expected and required.

## Target

Ask the operator for these if they are not already in your brief. Do not guess production passwords.

| Item | Value |
|------|--------|
| Base URL | `http://localhost:3000` or a Vercel preview. Prefer not `https://mckeesecurity.ca` unless the operator said so. |
| Staff email / password | McKee admin test login |
| Single-site client email / password | One house: one site, one person |
| Org account-admin email / password | County-style: two or more sites |
| Org member email / password | Second login on that org, role Member |
| Second site CODE | A second Lanvac-style code used only in test |

If an org pair does not exist yet, create it in Suite E using **Add site to an account**, then continue. Use obvious test names (`CUA House`, `CUA County Fire`, `CUA County Works`).

## How to look (every page)

Before marking a step pass:

1. Open DevTools Console. Note red errors (ignore third-party noise only if you can name the script, e.g. Elfsight on marketing pages; the portal should be clean).
2. Open Network. Note failed document/XHR/fetch (4xx/5xx) for same-origin `/user-dashboard`, `/admin-dashboard`, `/api/`.
3. At **390px** width (phone) and **1440px** (desktop): no horizontal page scroll. Buttons and fields stay inside the viewport. Tap targets are usable.
4. Screenshot the page if the step fails or if the suite says to.

## Findings report (required output)

Write a markdown report when you finish (or when a hard stop fires). Use this shape:

```markdown
# Portal CUA report
Date:
Base URL:
Build / commit if visible:

## Summary
- Suites run:
- Pass / fail / skip counts:
- Blockers (must fix before import):
- Non-blockers:

## Findings
### F1. short title
- Suite / step:
- URL:
- Viewport:
- What you did:
- Expected:
- Actual:
- Console / network:
- Screenshot:

## Suite log
- A: pass | fail | skip (why)
- L: skip until R54 UI, or pass | fail
...
```

Severity for blockers: anything that emails a real client, deletes the wrong login, shows another client’s site, writes the wrong site’s caller list or bill, or shows org chrome on a single-site house.

## Language to expect

- Client-facing roles: **Account admin** and **Member**. Never Master, Manager, or Admin alone.
- McKee staff console: administrator / staff. Not Account admin.
- Single-site house: no sites list, no site switcher, no People with access.

---

## Suite A. Reachability and mail gate

1. Open `{base}/user-dashboard` logged out. Sign-in form. No dashboard data.
2. Open `{base}/admin-dashboard` logged out. Staff sign-in. No KPIs.
3. Sign in as staff. Amber banner: client email is held until go-live. Link to Billing is fine. **Do not type GO LIVE.**
4. Open `{base}/admin-dashboard?tab=billing`. Confirm there is a paused-mail control. Leave it off.

## Suite B. Single-site client (majority path)

This is the most important regression. Most clients are not orgs.

1. Sign in as the single-site client at `/user-dashboard`.
2. Welcome uses their first name. One monitoring (and optional VoIP) card. No site switcher. No sites list. No “People with access.”
3. Tabs: Dashboard, Settings (`?tab=settings`), Alerts (`?tab=alerts`). All three render.
4. Settings: email is locked (sign-in identity). Change phone or address and save. Success. Reload. Value stuck. Admin should later see an account-change path if that alert exists; do not fail the suite if the staff alert is only in email.
5. Settings password: wrong current password is rejected. A valid change works only if the operator gave a disposable password. If you change it, record the new password in the report.
6. Dashboard: caller list visible if contacts exist. Save a harmless reorder or a test contact if the editor is open. Confirm the list is this house only.
7. Billing card: due date / rail matches this one site. Do not complete a live Stripe checkout against a real card unless the operator said test-mode is OK. Opening the billing portal or checkout and then cancelling is enough if Stripe is configured.
8. Sign out. Sign-in page again. Sign back in. Still no org chrome.

## Suite C. Auth edges (single-site)

1. Wrong password on `/user-dashboard`: error, stay signed out.
2. Google button: you may click once. If it would create an uninvited Google user, the app must bounce to “no account” and not leave you in the dashboard. Do not keep a random Google session.
3. `/account/reset-password` without a valid link: expired / retry state, not a crash.
4. `/account/activate` without a token: invalid-invite copy, not a stack trace.
5. Staff login on `/user-dashboard`: staff are sent to the “you are an administrator” frame with a link to `/admin-dashboard`, not a fake client dashboard.

## Suite D. Staff console (generic)

Sign in as staff.

1. `/admin-dashboard` Overview: KPI cards render. No uncaught error.
2. `?tab=clients`: list of clients. Search by a known test name. Open that row.
3. Client detail `/admin-dashboard/clients/{id}`: profile, services, caller list, devices, billing. Banner still says mail is paused.
4. `?tab=billing`: collections / due list. Test client appears if they have a due service. Account name chip is OK if multi-site exists; single-site must not look like “14 sites.”
5. `?tab=devices`: device table or empty state. Links to client detail work.
6. `?tab=alerts`: list or empty. Resolve one only if it is clearly a test alert.
7. Phone 390px: every admin tab above. No horizontal overflow. Sticky actions remain tappable.

## Suite E. Staff: New client vs Add site

Mail is paused. Creating a client must **not** send a real invite. Copy-link / “held until go-live” is the pass.

1. Clients tab. Two buttons: **New client** and **Add site to an account**. Not one combined wizard.
2. **New client:** one first name, last name, email (`cua-house-{time}@example.com`), optional address/phone, one monitoring tier, a unique fake CODE (follow the on-screen CODE rules), a dispatch city, billing rail Manual. Submit.
3. Success: client exists. Invite is held or a copy-link is shown. You are not told that mail went out.
4. Open the new client. One site. No sibling-site list (or a count of 1). Account card may exist; org chrome on the **client** side must still be hidden when you later log in as them (Suite B style) if they are the only person and only site.
5. **Add site to an account:** pick the CUA County account (or the house you just created if the operator wants a two-site test). Enter a second site name, a **different** CODE, same or other city, monitoring, Manual rail. Submit.
6. No second invite email. Account now has two sites. `auto_onboard` / auto-invite is off or the UI says invites are not automatic.
7. Clients list: the two county rows chip the same account name and a site count greater than 1.
8. Open site A. Account card lists site B as a link. Link works. Delete is labeled as this **site** if a delete control exists. **Do not delete** unless the operator said the row is disposable.
9. Disable site B only. Site A still opens. Re-enable site B. If re-enable is blocked because `user_id` is empty, that is a fail (plan item 18).
10. New client again with an email that already belongs to the county account admin. Warning must offer **Add site to an account**, not a silent second login.

## Suite F. Grouping board and Appoint account admin

1. Find the grouping / “possible multi-site” review (Clients or Billing). If the queue is empty, that is OK. You may sign off an empty queue. **Do not treat empty as a crash.**
2. If a suggestion exists for two CUA test rows, open it. Accept or reject only test rows. Do not accept a suggestion that would merge real-looking production names.
3. Appoint account admin on the CUA County account: enter the org account-admin test email. Send is allowed only if the UI says mail is paused and gives a **copy link**. Copy the link. Do not send to a real inbox.
4. Open the copy-link in a private window. Copy mentions **Account admin** and **Member**. Activating (if the operator allows) makes that person Account admin for **every** site on the account, not one CODE.

## Suite G. Org client (Account admin)

Sign in as the org Account admin.

1. `/user-dashboard` shows a **sites list** (name, address, CODE, short caller-list summary) and a switcher. Single-site chrome from Suite B must not be the only view.
2. Click site B. URL has `?site=` or the selected site is obvious. Caller list, devices, and billing are **site B**. A CODE or address from site A must not appear as if it were B.
3. Switch back to site A. Lists and bill follow A.
4. Settings → People with access. You are Account admin. Invite a Member (`cua-member-{time}@example.com`) if mail is paused: copy-link, do not expect a sent email.
5. Transfer account admin is visible. Do not transfer away from the operator’s main test admin unless they said to. If you have a disposable second activated member, transfer and confirm: you become Member, they become Account admin, then transfer back.
6. Phone 390px: switcher and sites list do not overflow. People controls remain tappable.

## Suite H. Org client (Member)

Sign in as the Member.

1. You can open every site on that account. Caller list save on the selected site works (or is allowed).
2. People with access is visible and **grayed out**. You cannot invite, revoke, or transfer.
3. Craft `{base}/user-dashboard?site={some-other-client-uuid}` (use the single-site house id). App must ignore it and stay on an allowed site. You must not see the house caller list. This is a blocker if it leaks.

## Suite I. Isolation and wrong-site writes

1. As the single-site client, open DevTools and try to load or save caller ID with the county site’s profile id (network request). Must fail (4xx or no change). County list unchanged.
2. As county Account admin, you must not see the house in the switcher.
3. Staff can open both. Clients cannot.

## Suite J. Delete / shared login (disposable rows only)

Only if the operator marked a **disposable** second site on an account that has another site and a shared login.

1. Delete that disposable site. Confirm copy says **site**.
2. Sign in as the remaining account admin. Login still works. The other site is still there.
3. If delete removed the login, that is a blocker.

If there is no disposable site, skip and say so.

## Suite L. Station layer (read + O5985-gated writes)

Run this on a **monitoring test site** with a Lanvac CODE. Never put a real customer on test. Use `O5985` only for a write sitting. Restore the zone table in [`LANVAC_STATION.md`](LANVAC_STATION.md) after any write.

1. Single-site monitoring client, Dashboard: station block sits after the monitoring card and before caller ID. Historic is at the bottom of that block. Settings / Alerts do not grow a second zone editor.
2. Client sees zone number, description, type, on-test, uses-call-list, panel type (or "Not on file"), last-known chip, Historic list. Client does **not** see delay, zone signal/restore codes, extra notify phones, or dealer fields. Historic signal codes stay on the staff card only.
3. If the CODE is not `O5985`, client on-test returns "Station writes are not live on this account." If it is `O5985`, account-level on-test works and Alerts badges while on test. Do not leave a site on test.
4. After R53: only the Account admin can start/stop **account-level** on-test. Member sees the chip and cannot start or stop. On-test is per site (Fire Hall must not mute Public Works). Skip until R53.
5. Staff client detail: Monitoring station card shows panel, chip, zone table, Refresh now, Historic, zone write controls, and on-test. Create-client does not require zones. Carbon monoxide zones cannot change type. Pulled live zones show "write fields unknown" and cannot be edited until the portal has stored delay / call list from a create. OffTest can return 500 if already off; the UI should still succeed. A refresh right after OnTest must not clear the chip (GET lags).
6. Isolation: site A zones / Historic must not appear as site B. Crafting another site's `profileId` on a station action must fail.
7. Confirm you did not call Lanvac `Account/status` or `Account/new`. Confirm you did not type `GO LIVE`.

## Suite K. Mail gate again

1. Still signed in as staff. Banner still paused. Billing still not live.
2. Confirm you never typed `GO LIVE`.
3. Confirm you did not run a QuickBooks or Lanvac write.

## Done

Attach the findings report. Blockers must be empty (or accepted in writing) before anyone starts the Windows MCP bridge or the real import.
