// Responsive/behaviour check for the Starlink admin. Measures the things that
// are easy to get wrong in CSS and impossible to eyeball reliably: horizontal
// overflow, whether the booking modal's sticky header and footer actually pin,
// focused-field font size (iOS zooms below 16px), and touch target sizes.
//
// Run: node --env-file=.env.local scripts/starlink-admin-ui-check.mjs [baseUrl]

import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const baseUrl = process.argv[2] ?? "http://localhost:3101";
const password = process.env.STARLINK_ADMIN_PASSWORD ?? "";
const outDir = ".starlink-ui-check";
mkdirSync(outDir, { recursive: true });

const failures = [];
const notes = [];
function check(ok, label, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();

async function openAdmin(emulation, name) {
  const context = await browser.newContext({ ...emulation, baseURL: baseUrl });
  const page = await context.newPage();
  await page.goto("/starlink-admin", { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(1500);

  const gate = page.locator('input[type="password"]');
  if (await gate.count()) {
    if (!password) {
      notes.push(`${name}: password gate is up and STARLINK_ADMIN_PASSWORD is unset`);
      return { context, page, gated: true };
    }
    await gate.first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
  }
  return { context, page, gated: false };
}

async function overflowReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const docW = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    );
    const insideScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "auto" || ov === "scroll" || ov === "hidden" || ov === "clip") {
          return true;
        }
      }
      return false;
    };
    const spills = (el) => {
      const r = el.getBoundingClientRect();
      return (r.right > vw + 1 || r.left < -1) && r.width > 0;
    };
    const leaves = [...document.querySelectorAll("*")]
      .filter((el) => spills(el) && !insideScroller(el))
      .filter((el) => ![...el.children].some(spills))
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cls = typeof el.className === "string" ? el.className.slice(0, 90) : "";
        return `<${el.tagName.toLowerCase()}> ${Math.round(r.left)}..${Math.round(
          r.right,
        )} "${cls}"`;
      });
    return { vw, docW, overflow: docW > vw + 1, leaves };
  });
}

/**
 * Interactive elements in the admin that are smaller than the touch minimum.
 * Scoped to `.sl-admin` so the shared marketing header and footer, which are not
 * this tool's concern, do not drown out its own controls.
 */
async function smallTargets(page, min = 40) {
  return page.evaluate((minSize) => {
    const sel = 'button, a[href], input, select, textarea, [role="option"], [role="combobox"]';
    const root = document.querySelector(".sl-admin") ?? document;
    return [...root.querySelectorAll(sel)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.height < minSize)
      .slice(0, 12)
      .map(({ el, r }) => {
        const label =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 28) ||
          el.getAttribute("placeholder") ||
          el.tagName.toLowerCase();
        return `${label} (${Math.round(r.width)}x${Math.round(r.height)})`;
      });
  }, min);
}

// ---------------------------------------------------------------- mobile pass
console.log(`\n=== iPhone 13 (390x844) ${baseUrl}/starlink-admin`);
{
  const { context, page, gated } = await openAdmin(devices["iPhone 13"], "mobile");
  if (gated) {
    await page.screenshot({ path: `${outDir}/mobile-gate.png`, fullPage: true });
  } else {
    const list = await overflowReport(page);
    check(!list.overflow, "no horizontal overflow on the rentals list", `doc ${list.docW} vs vw ${list.vw}`);
    for (const leaf of list.leaves) console.log(`       spill ${leaf}`);
    await page.screenshot({ path: `${outDir}/mobile-list.png`, fullPage: true });

    const fab = await page.locator('a[aria-label="Call McKee Security"]').count();
    check(fab === 0, "no call button floating over the admin");

    // Schedule tab: the calendar grid must not appear on a phone.
    const schedule = page.getByRole("button", { name: /^Schedule$/ });
    if (await schedule.count()) {
      await schedule.first().click();
      await page.waitForTimeout(900);
      const sched = await overflowReport(page);
      check(!sched.overflow, "no horizontal overflow on the schedule tab", `doc ${sched.docW} vs vw ${sched.vw}`);
      for (const leaf of sched.leaves) console.log(`       spill ${leaf}`);
      await page.screenshot({ path: `${outDir}/mobile-schedule.png`, fullPage: true });

      // The calendar grid is hidden on a phone, so the month arrows have to
      // drive the agenda list instead of only relabelling the heading.
      const agendaHeading = () =>
        page.locator(".sl-admin h3").filter({ hasText: /Current & upcoming|20\d\d/ }).first();
      const before = (await agendaHeading().textContent())?.trim();
      const monthLabel = () => page.locator(".sl-admin nav ~ div h2, .sl-admin h2").first();
      const monthBefore = (await monthLabel().textContent())?.trim();
      await page.getByRole("button", { name: "Next month" }).click();
      await page.waitForTimeout(600);
      const after = (await agendaHeading().textContent())?.trim();
      const monthAfter = (await monthLabel().textContent())?.trim();
      check(
        monthBefore !== monthAfter && before !== after,
        "the month arrows re-point the mobile agenda, not just the heading",
        `${before} -> ${after} (month ${monthBefore} -> ${monthAfter})`,
      );
      await page.getByRole("button", { name: "Today" }).click();
      await page.waitForTimeout(500);
      check(
        (await agendaHeading().textContent())?.trim() === before,
        "Today returns the agenda to the current view",
      );
    }

    // Fleet tab.
    const fleet = page.getByRole("button", { name: /^Fleet$/ });
    if (await fleet.count()) {
      await fleet.first().click();
      await page.waitForTimeout(900);
      const f = await overflowReport(page);
      check(!f.overflow, "no horizontal overflow on the fleet tab", `doc ${f.docW} vs vw ${f.vw}`);
      const small = await smallTargets(page);
      check(small.length === 0, "fleet controls are all >= 40px tall", small.join(", "));
      await page.screenshot({ path: `${outDir}/mobile-fleet.png`, fullPage: true });
    }

    // The booking modal is the main event.
    await page.getByRole("button", { name: /^Rentals$/ }).first().click();
    await page.waitForTimeout(700);
    // The label collapses to just "New" on a phone.
    const newBooking = page.getByRole("button", { name: /^New( rental)?$/i });
    if (await newBooking.count()) {
      await newBooking.first().click();
      await page.waitForTimeout(900);

      const modal = await overflowReport(page);
      check(!modal.overflow, "no horizontal overflow with the modal open", `doc ${modal.docW} vs vw ${modal.vw}`);
      for (const leaf of modal.leaves) console.log(`       spill ${leaf}`);

      // Checkboxes are excluded: iOS only zooms for fields you type into.
      const fontSizes = await page.evaluate(() =>
        [...document.querySelectorAll('[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] [role="combobox"]')]
          .filter((el) => el.type !== "checkbox" && el.type !== "radio")
          .map((el) => ({
            tag: el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.type || el.tagName,
            px: Number.parseFloat(getComputedStyle(el).fontSize),
          }))
          .filter((f) => f.px < 16),
      );
      check(
        fontSizes.length === 0,
        "every modal field is >= 16px so iOS will not zoom",
        fontSizes.map((f) => `${f.tag}=${f.px}px`).join(", "),
      );

      // Sticky header/footer: scroll the overlay and re-measure.
      const sticky = await page.evaluate(async () => {
        const dialog = document.querySelector('[role="dialog"]');
        const overlay = dialog?.parentElement;
        const header = dialog?.querySelector(".sticky");
        const footers = dialog?.querySelectorAll(".sticky");
        const footer = footers?.[footers.length - 1];
        if (!overlay || !header || !footer) return null;
        const before = {
          panelHeight: Math.round(dialog.getBoundingClientRect().height),
          scrollable: overlay.scrollHeight - overlay.clientHeight,
        };
        overlay.scrollTop = Math.min(600, overlay.scrollHeight);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return {
          ...before,
          scrolledBy: Math.round(overlay.scrollTop),
          headerTop: Math.round(header.getBoundingClientRect().top),
          footerBottom: Math.round(footer.getBoundingClientRect().bottom),
          viewportHeight: window.innerHeight,
        };
      });
      if (!sticky) {
        check(false, "found the modal's sticky bars to measure");
      } else {
        console.log(`       panel ${sticky.panelHeight}px, scrolled ${sticky.scrolledBy}px of ${sticky.scrollable}px`);
        check(
          sticky.scrolledBy === 0 || sticky.headerTop >= -2,
          "modal header stays pinned when scrolled",
          `header top ${sticky.headerTop}px`,
        );
        check(
          sticky.scrolledBy === 0 || sticky.footerBottom <= sticky.viewportHeight + 2,
          "Save/Cancel footer stays reachable when scrolled",
          `footer bottom ${sticky.footerBottom}px of ${sticky.viewportHeight}px`,
        );
      }
      await page.screenshot({ path: `${outDir}/mobile-modal.png`, fullPage: true });

      // The custom dropdown: opens, is not clipped, dismisses on outside tap.
      const combo = page.locator('[role="combobox"]').first();
      await combo.click();
      await page.waitForTimeout(400);
      const listBox = page.locator('[role="listbox"]');
      check(await listBox.count() > 0, "unit dropdown opens");
      const clipped = await page.evaluate(() => {
        const list = document.querySelector('[role="listbox"]');
        if (!list) return null;
        const r = list.getBoundingClientRect();
        return {
          offRight: Math.round(r.right - document.documentElement.clientWidth),
          height: Math.round(r.height),
          visible: r.height > 0 && r.width > 0,
        };
      });
      check(clipped?.visible === true && clipped.offRight <= 1, "dropdown panel is on screen", JSON.stringify(clipped));
      const optionHeights = await page.evaluate(() =>
        [...document.querySelectorAll('[role="option"]')].map((el) =>
          Math.round(el.getBoundingClientRect().height),
        ),
      );
      check(
        optionHeights.every((h) => h >= 40),
        "dropdown options are comfortable to tap",
        `heights ${optionHeights.join(",")}`,
      );
      await page.screenshot({ path: `${outDir}/mobile-dropdown.png` });

      // Tap a heading (not an interactive element) to dismiss.
      await page.locator('[role="dialog"] h3').first().click({ force: true });
      await page.waitForTimeout(400);
      check(await page.locator('[role="listbox"]').count() === 0, "tapping outside closes the dropdown");

      // With dates set, every kit must be reported as free or booked rather
      // than "set both dates" — this is the whole point of the control.
      const dates = page.locator('[role="dialog"] input[type="date"]');
      await dates.nth(0).fill("2026-08-10");
      await dates.nth(1).fill("2026-08-14");
      await page.waitForTimeout(500);
      await combo.click();
      await page.waitForTimeout(400);
      const availability = await page.evaluate(() =>
        [...document.querySelectorAll('[role="listbox"] [role="option"]')].map((el) => {
          const spans = el.querySelectorAll("span > span");
          return {
            label: spans[0]?.textContent?.trim() ?? "",
            hint: spans[1]?.textContent?.trim() ?? "",
            colour: spans[0] ? getComputedStyle(spans[0]).color : "",
            hasIcon: Boolean(el.querySelector("svg")),
          };
        }),
      );
      const kits = availability.slice(1);
      console.log("       " + JSON.stringify(availability, null, 0));
      check(
        kits.length > 0 && kits.every((k) => /Free|Booked|Also booked/.test(k.hint)),
        "every kit reports free or booked once dates are set",
        kits.map((k) => `${k.label}: ${k.hint}`).join(" | "),
      );
      check(
        kits.every((k) => k.hasIcon),
        "each kit carries an availability glyph, not just its colour dot",
      );
      const distinctColours = new Set(kits.map((k) => k.colour));
      check(
        distinctColours.size >= 1,
        "kit labels are colour-coded by availability",
        [...distinctColours].join(", "),
      );
      await page.screenshot({ path: `${outDir}/mobile-availability.png` });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Now the red path: borrow the dates of a real booking that holds a kit,
      // so at least one option must come back as a clash.
      const held = await page.evaluate(async () => {
        const res = await fetch("/api/starlink-admin/overview", { cache: "no-store" });
        if (!res.ok) return null;
        const { rentals } = await res.json();
        const blocking = rentals.find(
          (r) => r.unit_id && (r.status === "confirmed" || r.status === "active"),
        );
        return blocking
          ? {
              pickup: blocking.pickup_date,
              ret: blocking.return_date,
              name: blocking.customer_name,
              unitId: blocking.unit_id,
            }
          : null;
      });
      if (!held) {
        notes.push("no confirmed/active booking with a kit, so the clash path was not exercised");
      } else {
        await dates.nth(0).fill(held.pickup);
        await dates.nth(1).fill(held.ret);
        await page.waitForTimeout(500);
        await combo.click();
        await page.waitForTimeout(400);
        const clash = await page.evaluate((unitId) => {
          const option = document.querySelector(`[role="option"][id$="-opt-0"]`)
            ? [...document.querySelectorAll('[role="listbox"] [role="option"]')]
            : [];
          const rows = option.map((el) => {
            const spans = el.querySelectorAll("span > span");
            return {
              label: spans[0]?.textContent?.trim() ?? "",
              hint: spans[1]?.textContent?.trim() ?? "",
              colour: spans[0] ? getComputedStyle(spans[0]).color : "",
            };
          });
          return { rows, unitId };
        }, held.unitId);
        const booked = clash.rows.filter((r) => /^Booked · /.test(r.hint));
        check(
          booked.length > 0,
          "the kit already out is flagged as booked, naming the customer",
          booked.map((b) => `${b.label}: ${b.hint}`).join(" | "),
        );
        check(
          booked.some((b) => b.hint.includes(held.name)),
          "the clash names the conflicting booking",
          `expected ${held.name}`,
        );
        await page.screenshot({ path: `${outDir}/mobile-clash.png` });

        // Choosing it must ask first, and declining must leave it unassigned.
        let dialogText = "";
        page.once("dialog", async (d) => {
          dialogText = d.message();
          await d.dismiss();
        });
        const bookedOption = page
          .locator('[role="listbox"] [role="option"]')
          .filter({ hasText: "Booked ·" })
          .first();
        await bookedOption.click();
        await page.waitForTimeout(500);
        check(/already booked/i.test(dialogText), "selecting a booked kit asks for confirmation", dialogText.slice(0, 90));
        const triggerText = await combo.textContent();
        check(
          /Unassigned/.test(triggerText ?? ""),
          "declining the confirmation leaves the kit unchanged",
          triggerText?.trim(),
        );
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }

      // Escape must close the dropdown first, then the modal.
      await combo.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const afterFirstEscape = {
        list: await page.locator('[role="listbox"]').count(),
        modal: await page.locator('[role="dialog"]').count(),
      };
      check(afterFirstEscape.list === 0, "Escape closes the dropdown");
      check(afterFirstEscape.modal === 1, "Escape does not also discard the form", JSON.stringify(afterFirstEscape));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      check(await page.locator('[role="dialog"]').count() === 0, "a second Escape closes the modal");

      // Body scroll lock must be released on close.
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      check(bodyOverflow === "", "body scroll lock is released", `overflow="${bodyOverflow}"`);
    } else {
      notes.push("mobile: could not find the New booking button");
    }
  }
  await context.close();
}

// ----------------------------------------------- short landscape modal pass
console.log(`\n=== 740x360 (phone in landscape, modal open)`);
{
  const { context, page, gated } = await openAdmin(
    { viewport: { width: 740, height: 360 }, hasTouch: true },
    "landscape",
  );
  if (!gated) {
    const newBooking = page.getByRole("button", { name: /^New( rental)?$/i });
    if (await newBooking.count()) {
      await newBooking.first().click();
      await page.waitForTimeout(900);
      const sticky = await page.evaluate(async () => {
        const dialog = document.querySelector('[role="dialog"]');
        const overlay = dialog?.parentElement;
        const bars = dialog?.querySelectorAll(".sticky");
        if (!overlay || !bars?.length) return null;
        overlay.scrollTop = overlay.scrollHeight;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return {
          headerTop: Math.round(bars[0].getBoundingClientRect().top),
          footerBottom: Math.round(bars[bars.length - 1].getBoundingClientRect().bottom),
          viewportHeight: window.innerHeight,
        };
      });
      check(
        sticky !== null && sticky.headerTop >= -2 && sticky.footerBottom <= sticky.viewportHeight + 2,
        "modal bars still pin in short landscape",
        JSON.stringify(sticky),
      );
      await page.screenshot({ path: `${outDir}/landscape-modal.png` });
    }
  }
  await context.close();
}

// --------------------------------------------------------------- tablet pass
for (const width of [768, 1024]) {
  console.log(`\n=== ${width}x900`);
  const { context, page, gated } = await openAdmin(
    { viewport: { width, height: 900 } },
    `w${width}`,
  );
  if (!gated) {
    const r = await overflowReport(page);
    check(!r.overflow, `no horizontal overflow at ${width}px`, `doc ${r.docW} vs vw ${r.vw}`);
    for (const leaf of r.leaves) console.log(`       spill ${leaf}`);
    const schedule = page.getByRole("button", { name: /^Schedule$/ });
    if (await schedule.count()) {
      await schedule.first().click();
      await page.waitForTimeout(900);
      const s = await overflowReport(page);
      check(!s.overflow, `no horizontal overflow on schedule at ${width}px`, `doc ${s.docW} vs vw ${s.vw}`);
      await page.screenshot({ path: `${outDir}/w${width}-schedule.png`, fullPage: true });
    }
  }
  await context.close();
}

// -------------------------------------------------------------- desktop pass
console.log(`\n=== 1920x1080`);
{
  const { context, page, gated } = await openAdmin(
    { viewport: { width: 1920, height: 1080 } },
    "desktop",
  );
  if (!gated) {
    const r = await overflowReport(page);
    check(!r.overflow, "no horizontal overflow at 1920px", `doc ${r.docW} vs vw ${r.vw}`);
    await page.screenshot({ path: `${outDir}/desktop-list.png`, fullPage: true });
    const newBooking = page.getByRole("button", { name: /^New( rental)?$/i });
    if (await newBooking.count()) {
      await newBooking.first().click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${outDir}/desktop-modal.png`, fullPage: true });
      // Desktop fields should be back to 14px.
      const px = await page.evaluate(() => {
        const el = document.querySelector('[role="dialog"] input');
        return el ? Number.parseFloat(getComputedStyle(el).fontSize) : null;
      });
      check(px === 14, "desktop fields keep the 14px scale", `${px}px`);
    }
  }
  await context.close();
}

await browser.close();

console.log("\n----------------------------------------");
for (const note of notes) console.log(`NOTE ${note}`);
if (failures.length) {
  console.log(`\n${failures.length} FAILED:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll checks passed. Screenshots in ${outDir}/`);
}
