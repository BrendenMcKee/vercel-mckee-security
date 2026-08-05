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

console.log("\n=== rendering the reminder emails");
await sendPickupTodayReminder(rental);
// Second argument is the lead time the job computes; PAYMENT_LEAD_DAYS is 2.
await sendPaymentBeforePickupReminder(rental, 2);
// Two groups, one of them long enough to exercise the 25-item cap.
await sendRentalActionDigest([
  {
    label: "Overdue returns",
    instruction: "These were due back and are still marked out.",
    items: [
      {
        rentalId: rental.id,
        customerName: rental.customer_name,
        detail: "Due back Aug 16. Still marked Out.",
      },
    ],
  },
  {
    label: "No payment recorded",
    instruction: "Money is outstanding on these bookings.",
    items: Array.from({ length: 30 }, (_, i) => ({
      rentalId: `aaaaaaaa-bbbb-cccc-dddd-00000000${String(i).padStart(4, "0")}`,
      customerName: `Customer Number ${i + 1}`,
      detail: `$1,254.25 outstanding. Pickup was Aug ${(i % 28) + 1}.`,
    })),
  },
]);

check(sent.length === 3, "all three reminders rendered and dispatched", `${sent.length} of 3`);

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();

for (const payload of sent) {
  const name = payload.subject.replace(/^McKee Security \| /, "");
  console.log(`\n=== ${name}`);
  const html = payload.html;

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

  if (/Need Attention/i.test(payload.subject)) {
    check(/and 5 more in the admin portal/.test(dom.text), "long group is capped with an overflow line");
    check(
      (payload.text ?? "").includes("and 5 more in the admin portal"),
      "plaintext fallback is capped too",
    );
  }
  check(
    typeof payload.text === "string" && payload.text.length > 80,
    "plaintext alternative present",
    `${payload.text?.length ?? 0} chars`,
  );
}

await browser.close();

console.log("\n----------------------------------------");
if (failures.length) {
  console.log(`${failures.length} FAILED:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("All email checks passed.");
}
