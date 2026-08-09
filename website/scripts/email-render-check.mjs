// Renders the internal Starlink reminder emails through the real send path and
// checks the HTML for the things that silently break in mail clients: rgba()
// text colours (Outlook's Word engine drops the whole declaration, leaving
// near-black text on a near-black card), block elements orphaned out of a <p>,
// unbreakable long strings that make Gmail shrink the whole message, and
// unbalanced tags. Nothing is sent: fetch is stubbed and the payload captured.
//
// Run: node --import ./scripts/register-ts-alias.mjs scripts/email-render-check.mjs

process.env.RESEND_API_KEY = "test-key-not-used";
process.env.STARLINK_REMINDER_EMAIL = "andi@example.com";
process.env.NEXT_PUBLIC_SITE_URL = "https://mckeesecurity.ca";

const sent = [];
globalThis.fetch = async (_url, init) => {
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ id: "stubbed" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const {
  sendPickupTodayReminder,
  sendPaymentBeforePickupReminder,
  sendDepositOverdueReminder,
  sendRentalActionDigest,
} = await import("@/lib/starlink/reminder-emails.ts");

const failures = [];
function check(ok, label, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

// A booking with the awkward cases in it: a very long address with no break
// opportunity, an apostrophe and an angle bracket to prove escaping, and a
// deposit that is being held.
const rental = {
  id: "11111111-2222-3333-4444-555555555555",
  customer_name: "Sonya O'Brien-Trudel <test>",
  customer_email: "sonya.obrien.trudel.and.family@averylongdomainname-example.ca",
  customer_phone: "(705) 555-0134",
  pickup_date: "2026-08-07",
  pickup_time: "10:00 AM",
  return_date: "2026-08-16",
  status: "confirmed",
  quoted_price: 1254.25,
  amount_received: 500,
  deposit_amount: 300,
  deposit_received: true,
  deposit_returned: false,
  unit: { name: "Starlink 2" },
};

// ---------------------------------------------------------------------------
// Which section a booking lands in
// ---------------------------------------------------------------------------

const { buildDigestGroups } = await import("@/lib/starlink/reminders.ts");

const TODAY = "2026-08-09";
const day = (offset) =>
  new Date(Date.parse(`${TODAY}T12:00:00Z`) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);

let bookingSeq = 1;

/** A booking with everything settled, so each case below changes only one thing. */
function booking(overrides) {
  const rental = {
    id: `00000000-0000-4000-8000-${String(bookingSeq++).padStart(12, "0")}`,
    customer_name: "Test Booking",
    customer_email: "test@example.ca",
    customer_phone: null,
    status: "returned",
    unit_id: "unit-1",
    unit: { name: "Starlink 1" },
    pickup_date: day(-20),
    pickup_time: null,
    return_date: day(-10),
    quoted_price: 200,
    amount_received: 200,
    deposit_amount: 300,
    deposit_received: true,
    deposit_returned: true,
    created_at: `${day(-30)}T12:00:00.000Z`,
    ...overrides,
  };
  // A finished booking was last written when it was finished, so unless a case
  // is specifically about an early cancellation, updated_at follows the return
  // date. Leaving it fixed would make the row claim it was wrapped up days
  // before the rental ended.
  return {
    updated_at: `${rental.return_date}T12:00:00.000Z`,
    ...rental,
  };
}

const cases = [
  {
    what: "a deposit owed since today is a job for today, not an overdue one",
    rental: booking({ return_date: TODAY, deposit_returned: false }),
    section: "Send 1 deposit back",
    priority: "today",
    flag: "due today",
  },
  {
    what: "a deposit owed since yesterday has crossed into overdue",
    rental: booking({ return_date: day(-1), deposit_returned: false }),
    section: "Send 1 deposit back — overdue",
    priority: "urgent",
    flag: "1 day overdue",
  },
  {
    what: "a booking cancelled 5 days ago counts from the cancellation, not its future return date",
    rental: booking({
      status: "cancelled",
      pickup_date: day(3),
      return_date: day(12),
      deposit_returned: false,
      updated_at: `${day(-5)}T12:00:00.000Z`,
    }),
    section: "Send 1 deposit back — overdue",
    priority: "urgent",
    flag: "5 days overdue",
  },
  {
    what: "a kit two days past its return date is chased with the day count",
    rental: booking({ status: "active", return_date: day(-2) }),
    section: "Chase 1 kit that is late back",
    priority: "urgent",
    flag: "2 days late",
  },
  {
    what: "an unreserved booking picking up tomorrow outranks everything else",
    rental: booking({
      status: "confirmed",
      unit_id: null,
      unit: null,
      pickup_date: day(1),
      return_date: day(8),
    }),
    section: "Assign a kit to 1 booking",
    priority: "urgent",
    flag: "picks up in 1 day",
  },
  {
    what: "an unreserved booking a fortnight out is only a job for today",
    rental: booking({
      status: "confirmed",
      unit_id: null,
      unit: null,
      pickup_date: day(14),
      return_date: day(21),
    }),
    section: "Assign a kit to 1 booking",
    priority: "today",
    flag: "picks up in 14 days",
  },
  {
    what: "an unanswered request is chased with how long it has waited",
    rental: booking({
      status: "requested",
      unit_id: null,
      unit: null,
      pickup_date: day(20),
      return_date: day(27),
      quoted_price: null,
      amount_received: null,
      deposit_amount: null,
      deposit_received: false,
      deposit_returned: false,
      created_at: `${day(-4)}T12:00:00.000Z`,
    }),
    section: "Reply to 1 website request",
    priority: "today",
    flag: "waiting 4 days",
  },
];

console.log("\n=== which section a booking lands in");
for (const { what, rental, section, priority, flag } of cases) {
  const groups = buildDigestGroups([rental], TODAY);
  const found = groups.find((g) => g.action === section);
  const item = found?.items.find((i) => i.rentalId === rental.id);
  const ok =
    Boolean(found) && found.priority === priority && item?.flag === flag;
  check(
    ok,
    what,
    ok
      ? `${found.icon} ${section} · ${priority} · "${flag}"`
      : `got ${
          groups.map((g) => `${g.action} (${g.priority}, "${g.items[0]?.flag}")`).join(" | ") ||
          "no sections"
        }`,
  );
}

console.log("\n=== rendering the reminder emails");
await sendPickupTodayReminder(rental);
// Second argument is the lead time the job computes; PAYMENT_LEAD_DAYS is 2.
await sendPaymentBeforePickupReminder(rental, 2);
await sendDepositOverdueReminder(rental, 3);

// Deliberately handed over out of priority order, and with a group long enough
// to exercise the 25-item cap, so the sort and the cap are both exercised.
await sendRentalActionDigest([
  {
    icon: "📤",
    priority: "soon",
    action: "Mark 1 booking as Out",
    summary: "1 booking to mark Out",
    instruction: "Pickup day has passed but this still says Confirmed.",
    items: [
      {
        rentalId: "cccccccc-dddd-eeee-ffff-000000000001",
        customerName: "Rosanne Mark",
        detail: "Pickup was Fri, Jul 31, 2026 · Starlink 2",
      },
    ],
  },
  {
    icon: "💵",
    priority: "urgent",
    action: "Send 1 deposit back — overdue",
    summary: "1 deposit overdue",
    instruction:
      "This is the customer's own money and the rental is already over. Send it back today, then tick Deposit returned on the booking.",
    items: [
      {
        rentalId: rental.id,
        customerName: rental.customer_name,
        detail: "$300.00 held · owed since Sun, Aug 16, 2026",
        flag: "3 days overdue",
      },
    ],
  },
  {
    icon: "💳",
    priority: "today",
    action: "Check 30 payments",
    summary: "30 payments to check",
    instruction: "The kit has gone out but the booking is not marked paid.",
    items: Array.from({ length: 30 }, (_, i) => ({
      rentalId: `aaaaaaaa-bbbb-cccc-dddd-00000000${String(i).padStart(4, "0")}`,
      customerName: `Customer Number ${i + 1}`,
      detail: `$1,254.25 of $1,254.25 still owed · picked up Aug ${(i % 28) + 1}`,
    })),
  },
]);

check(sent.length === 4, "all four reminders rendered and dispatched", `${sent.length} of 4`);

const { chromium } = await import("playwright");
const { mkdir, writeFile } = await import("node:fs/promises");
const browser = await chromium.launch();
const page = await browser.newPage();

// The rendered HTML and a screenshot of each, so copy changes can be eyeballed
// rather than only asserted on. Gitignored.
const outDir = ".email-check";
await mkdir(outDir, { recursive: true });
const shot = await browser.newPage();

for (const payload of sent) {
  // sendEmail brands every subject, so the reminder's own wording is what is
  // left after the prefix, while the length budget is the whole thing.
  const subject = payload.subject.replace(/^McKee Security \| /, "");
  console.log(`\n=== ${subject}`);
  const html = payload.html;

  const slug = subject
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  await writeFile(`${outDir}/${slug}.html`, html, "utf8");
  for (const width of [390, 700]) {
    await shot.setViewportSize({ width, height: 900 });
    await shot.setContent(html, { waitUntil: "load" });
    await shot.screenshot({ path: `${outDir}/${slug}-${width}.png`, fullPage: true });
  }

  // The subject is what gets triaged in the inbox list, so it has to name the
  // job and survive the width clients truncate at.
  check(
    payload.subject.length <= 95,
    "subject fits the inbox column",
    `${payload.subject.length} chars`,
  );
  check(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(payload.subject),
    "subject carries a glyph for scanning",
  );

  // Colour declarations must be opaque so Outlook keeps them.
  const rgbaColours = [...html.matchAll(/(?<!-)\bcolor:\s*rgba\([^)]*\)/g)].map((m) => m[0]);
  check(rgbaColours.length === 0, "no rgba() text colours", rgbaColours.join(", "));

  // Anything user-supplied must be escaped.
  check(!html.includes("<test>"), "customer name is escaped");
  check(html.includes("&lt;test&gt;"), "escaped name is still present");

  // Long strings need a break opportunity or Gmail scales the whole email down.
  check(
    !html.includes("averylongdomainname") ||
      /word-break:break-word/.test(html),
    "long values can wrap",
  );

  const dom = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "text/html");
    // A <p> cannot contain block content: the parser closes it early, so any
    // such nesting in the source shows up as an empty p plus orphaned siblings.
    const blocksInParagraphs = [...doc.querySelectorAll("p")].filter((p) =>
      p.querySelector("div, p, table, ul, ol"),
    ).length;
    const emptyParagraphs = [...doc.querySelectorAll("p")].filter(
      (p) => p.textContent.trim() === "" && p.children.length === 0,
    ).length;
    return {
      blocksInParagraphs,
      emptyParagraphs,
      links: [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href")),
      text: doc.body.textContent.replace(/\s+/g, " ").trim(),
      hasViewport: Boolean(doc.querySelector('meta[name="viewport"]')),
      tables: doc.querySelectorAll("table").length,
      bytes: source.length,
    };
  }, html);

  check(dom.blocksInParagraphs === 0, "no block elements nested in a paragraph");
  check(dom.emptyParagraphs === 0, "no paragraphs orphaned from their content", `${dom.emptyParagraphs}`);
  check(dom.hasViewport, "viewport meta present");
  check(dom.tables >= 3, "table-based scaffolding intact", `${dom.tables} tables`);

  // Every booking link must be absolute and deep-link to that rental.
  const rentalLinks = dom.links.filter((h) => h?.includes("rental="));
  check(
    rentalLinks.length > 0 && rentalLinks.every((h) => h.startsWith("https://")),
    "booking links are absolute deep links",
    rentalLinks[0] ?? "none",
  );

  // Gmail clips messages over ~102KB, which would cut off the footer.
  check(dom.bytes < 90_000, "well under Gmail's clipping threshold", `${(dom.bytes / 1024).toFixed(1)}KB`);

  // No formatCurrency(null) em dashes stranded mid-sentence.
  check(!/\s—\s?\./.test(dom.text), "no stray em dash where an amount belongs");

  // The digest is the one that has to be triaged rather than read.
  if (/Overdue:|Today:|To sort:/.test(payload.subject)) {
    check(/and 5 more in the admin portal/.test(dom.text), "long group is capped with an overflow line");
    check(
      (payload.text ?? "").includes("and 5 more in the admin portal"),
      "plaintext fallback is capped too",
    );
    check(
      subject.startsWith("💵 Overdue: 1 deposit overdue"),
      "subject leads with the most urgent job",
      subject,
    );
    // Trimming has to cut from the least urgent end, never leave a gap in the
    // middle, or a shorter low-priority job displaces the one dropped.
    check(
      subject === "💵 Overdue: 1 deposit overdue, 30 payments to check, +1 more",
      "trimming drops the least urgent job, not an arbitrary one",
      subject,
    );
    // Sections must be ordered by urgency regardless of the order the job
    // happened to assemble them in.
    const order = ["Overdue · do this first", "Do today", "When you get a chance"]
      .map((band) => html.indexOf(band))
      .filter((at) => at >= 0);
    check(
      order.length === 3 && order.every((at, i) => i === 0 || at > order[i - 1]),
      "urgency bands run urgent then today then soon",
      order.join(" < "),
    );
    check(
      html.includes("Send 1 deposit back") &&
        html.includes("Check 30 payments") &&
        html.includes("Mark 1 booking as Out"),
      "each section is headed by what to do, not what is wrong",
    );
    check(
      dom.text.includes("3 days overdue"),
      "a booking's own urgency shows next to their name",
    );
    for (const glyph of ["💵", "💳", "📤"]) {
      check(dom.text.includes(glyph), `section glyph ${glyph} survives`);
    }
  }

  if (/Deposit overdue/.test(payload.subject)) {
    check(
      /send \$300\.00 back to/.test(payload.subject),
      "escalation names the amount and the person in the subject",
      payload.subject,
    );
    check(dom.text.includes("Tick Deposit returned"), "escalation says how to clear it");
  }
  check(
    typeof payload.text === "string" && payload.text.length > 80,
    "plaintext alternative present",
    `${payload.text?.length ?? 0} chars`,
  );
}

await browser.close();

console.log(`\nRendered HTML and screenshots in ${outDir}/`);
console.log("----------------------------------------");
if (failures.length) {
  console.log(`${failures.length} FAILED:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("All email checks passed.");
}
