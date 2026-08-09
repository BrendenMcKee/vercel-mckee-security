# Starlink Rental Reminders (internal)

Automatic emails that keep the rental system honest: they chase the things a
person meant to do in the admin portal and did not. **Nothing here ever reaches
a customer** — every message goes to the internal recipient below, and every one
links straight to the booking it is about.

## Who gets them

| | |
|---|---|
| Default recipient | `andi@mckeesecurity.ca` |
| Override | `STARLINK_REMINDER_EMAIL` (comma-separated for more than one) |
| Sender | the shared `EMAIL_FROM` Resend address |
| Needs | `RESEND_API_KEY` (without it the job logs and sends nothing) |

Every email's button opens `/starlink-admin?rental=<id>`, which unlocks to the
schedule with that booking's details already open. The password gate still
applies; unlocking keeps the link and opens the booking.

## When they run

`/api/cron/daily` (06:00 UTC, ~2 AM ET) runs the reminder job alongside the
portal jobs. `/api/cron/starlink-reminders` is the same job on its own for a
manual run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://mckeesecurity.ca/api/cron/starlink-reminders
```

## What gets sent

### Sent once, on the day it matters

Recorded in `rental_reminders` (`rental_id` + `kind` + `sent_for`) after the
email actually goes out, never before, so a failure is retried rather than
swallowed. Moving a booking's pickup date earns a fresh reminder for the new
date. A pickup reminder has no tomorrow to retry into, so if that send fails the
booking is carried in the same morning's digest instead and the failure is
written to the Alerts tab.

| Reminder | Fires when |
|----------|-----------|
| **Pickup today** | a Confirmed or Out booking's pickup date is today. Lists the pickup time, the unit, where the kit is going, and flags an unpaid balance or an uncollected deposit so both can be handled at the counter |
| **Payment not in yet** | a Confirmed booking is not paid in full and pickup is within 2 days (`PAYMENT_LEAD_DAYS`). Pickup day itself is skipped: the pickup email already covers it |
| **Deposit not sent back** | a finished booking's deposit has been owed for a day or more (`DEPOSIT_OVERDUE_AFTER_DAYS`). Unlike the two above, `sent_for` is the date it was *sent*, so this repeats every day — with the running day count in the subject — until Deposit returned is ticked |

The deposit escalation exists because that is the one place in the system where
the money is the customer's rather than ours, and a line in a digest is easy to
skim past. Day one it is a job in the digest under *Do today*; from the next day
it moves to *Overdue* **and** gets its own email naming the amount and the person
in the subject.

The day the clock starts from is the return date, or the day a booking was
cancelled if that came first — a booking cancelled before it ever ran has a
return date in the future, so that cannot be the reference.

### Repeats daily until it is dealt with

One digest listing everything outstanding, most urgent first, with a link per
booking. Deliberately unguarded — that repetition *is* the reminder. No email is
sent on a day when there is nothing to act on.

Every section is headed by the **action** rather than the fault ("Send 2 deposits
back", not "Deposit still to go back"), carries a glyph so it can be found
without reading, and sits under one of three urgency bands that also decide the
order and the subject line:

| Band | Meaning |
|------|---------|
| **Overdue · do this first** (red) | someone is already waiting on us |
| **Do today** (amber) | due now, not yet late |
| **When you get a chance** (grey) | tidy-up that affects no one today |

| Section | Band | Fires when |
|---------|------|-----------|
| **Get kits ready for pickup today** | overdue | a pickup email failed to send, so the digest carries it instead |
| **Chase kits that are late back** | overdue | Confirmed or Out and the return date has passed. Chipped with how many days late |
| **Send deposits back — overdue** | overdue | deposit owed for a day or more. Chipped with how many days overdue |
| **Send deposits back** | today | Returned or Cancelled, deposit received, rental only just finished |
| **Assign a kit to bookings** | overdue if pickup is within 2 days, else today | Confirmed or Out with no unit, so the dates are not actually reserved and can still be sold twice. Chipped with how close the pickup is |
| **Check payments** | today | a price is set and not paid in full, once the kit is out (Out, Returned, or still Confirmed on/after pickup day) |
| **Reply to website requests** | today | a website request older than a day that has not been quoted. Chipped with how long it has waited |
| **Put a price on bookings** | today | no rental price at all, once pickup is within 2 days or has passed. Nothing can show as owed until this is filled in |
| **Mark bookings as Out** | soon | still Confirmed although pickup day has passed |

The subject lists the jobs rather than a bare count — `Overdue: 1 deposit
overdue, 2 kits late back, +1 more` — leading with the most urgent band and
trimmed to survive the width mail clients truncate at. Bookings, not rows, are
what get counted: one booking needing two things is one item.

Each section lists at most 25 bookings and then says how many more are waiting,
so a burst of website requests cannot make the digest undeliverable.

Finished bookings whose return date is more than 120 days old (`LOOKBACK_DAYS`)
drop out — a row that nags forever just teaches people to ignore the email.
Anything still open (Requested, Confirmed, Out) stays in scope however old it
is, because a kit that went out months ago and was never marked back is exactly
what this job is for.

## When something goes wrong

A reminder job that reports success while telling nobody anything is the worst
outcome, so every partial failure — the guard table being unreachable, a digest
Resend rejects, a pickup email that would not send — is written to
`portal_alerts` and shows up in the admin portal's **Alerts** tab, and is
returned in the job's `notes` for `npm run cron:check`.

## Where the code lives

| Path | Role |
|------|------|
| `website/src/lib/starlink/reminders.ts` | the job: which bookings qualify, urgency bands, guard handling |
| `website/src/lib/starlink/reminder-emails.ts` | recipients, deep links, subject lines, the four email bodies |
| `website/src/app/api/cron/starlink-reminders/route.ts` | manual-run route (`CRON_SECRET` bearer) |
| `website/src/app/api/cron/daily/route.ts` | daily dispatcher that includes the job |
| `supabase/migrations/20260805203558_starlink_rental_reminders.sql` | `rental_reminders` guard table |
| `supabase/migrations/20260809193009_starlink_deposit_overdue_reminder.sql` | adds the `deposit_overdue` guard kind |
| `website/src/lib/portal/cron/cleanup.ts` | prunes guard rows older than 90 days |
| `website/scripts/email-render-check.mjs` | renders all four through the real send path with `fetch` stubbed, and screenshots them |

Thresholds are single constants at the top of `reminders.ts`
(`PAYMENT_LEAD_DAYS`, `REQUEST_REPLY_GRACE_DAYS`, `DEPOSIT_OVERDUE_AFTER_DAYS`,
`UNIT_URGENT_WITHIN_DAYS`, `LOOKBACK_DAYS`).

After changing any wording or colour here, run the render check — it catches the
things that only break in a mail client:

```bash
cd website && node --import ./scripts/register-ts-alias.mjs scripts/email-render-check.mjs
```
