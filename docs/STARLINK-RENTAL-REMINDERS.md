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
email actually goes out, so a failed send retries tomorrow instead of vanishing.
Moving a booking's pickup date earns a fresh reminder for the new date.

| Reminder | Fires when |
|----------|-----------|
| **Pickup today** | a Confirmed or Out booking's pickup date is today. Lists the pickup time, the unit, where the kit is going, and flags an unpaid balance or an uncollected deposit so both can be handled at the counter |
| **Payment not in yet** | a Confirmed booking is not paid in full and pickup is within 2 days (`PAYMENT_LEAD_DAYS`). Pickup day itself is skipped: the pickup email already covers it |

### Repeats daily until it is dealt with

One digest listing everything outstanding, most urgent first, with a link per
booking. Deliberately unguarded — that repetition *is* the reminder. No email is
sent on a day when there is nothing to act on.

| Group | Fires when |
|-------|-----------|
| **Kit is late back** | Confirmed or Out and the return date has passed |
| **Deposit still to go back** | Returned or Cancelled, deposit received, not yet returned |
| **Payment never recorded** | Out or Returned with a price set and not paid in full |
| **Not marked as picked up** | still Confirmed although pickup day has passed |
| **Request waiting on a reply** | a website request older than a day that has not been quoted |

Bookings whose return date is more than 120 days old (`LOOKBACK_DAYS`) drop out
of the digest. A row that nags forever just teaches people to ignore the email.

## Where the code lives

| Path | Role |
|------|------|
| `website/src/lib/starlink/reminders.ts` | the job: which bookings qualify, guard handling |
| `website/src/lib/starlink/reminder-emails.ts` | recipients, deep links, the three email bodies |
| `website/src/app/api/cron/starlink-reminders/route.ts` | manual-run route (`CRON_SECRET` bearer) |
| `website/src/app/api/cron/daily/route.ts` | daily dispatcher that includes the job |
| `supabase/migrations/20260805200000_starlink_rental_reminders.sql` | `rental_reminders` guard table |

Thresholds are single constants at the top of `reminders.ts`
(`PAYMENT_LEAD_DAYS`, `REQUEST_REPLY_GRACE_DAYS`, `LOOKBACK_DAYS`).
