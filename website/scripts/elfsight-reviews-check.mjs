// Checks that the Elfsight Google Reviews widget actually renders everywhere it is
// supposed to. This is worth automating because the failure mode is silent: Elfsight's
// platform.js only scans for widget containers once, so a widget can render fine on a
// hard load and then be an empty div after a client-side navigation, and nothing in the
// build or the console tells you.
//
// Verifies, on the homepage and /gallery, at a phone and a desktop viewport:
//   - the right one of the two configured widgets is mounted (they are separate
//     Elfsight apps, one built for mobile and one for desktop)
//   - the container actually fills with widget content, not just an empty div
//   - the same holds after an in-app navigation, after returning to a page a second
//     time, and after a resize across the mobile/desktop breakpoint
//   - platform.js is injected exactly once, since it must not be evaluated twice
//   - the section does not overflow horizontally
// Also confirms the retired /api/reviews route is really gone.
//
// Needs internet access (elfsightcdn.com) and a running dev server.
// Run: node scripts/elfsight-reviews-check.mjs [baseUrl]

import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = ".elfsight-reviews-check";
mkdirSync(outDir, { recursive: true });

const WIDGET_IDS = {
  mobile: "cdefeb12-5f4d-4841-8788-8fdf4e8e97af",
  desktop: "0e6db085-594e-4cf0-9db8-2d7553f61b44",
};

const desktopViewport = { width: 1440, height: 900 };
const phone = devices["iPhone 13"];

// Must match RESERVED_HEIGHT_CLASS in elfsight-google-reviews.tsx. The component holds
// this much space open from the first paint so the sections below do not get shoved down
// when Elfsight lands, so the numbers have to stay in step with what the widgets actually
// render — re-measure and update both places if this fails.
const RESERVED_HEIGHT = { mobile: 589, desktop: 655 };
const HEIGHT_TOLERANCE = 24;

const failures = [];
const notes = [];
function check(ok, label, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();

/**
 * Waits for real review content, not just a non-empty container: Elfsight paints a
 * short loading skeleton first, so height alone will happily pass on an unloaded widget.
 */
async function waitForWidget(page, expected) {
  const selector = `.elfsight-app-${WIDGET_IDS[expected]}`;
  await page.locator(selector).scrollIntoViewIfNeeded();
  // Elfsight's default lazy mode loads on viewport entry or first user activity.
  await page.mouse.move(10, 10);
  try {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        return /reviews? on/i.test(text) && text.length > 80;
      },
      selector,
      { timeout: 45_000 },
    );
    await page.waitForTimeout(1200);
    return true;
  } catch {
    return false;
  }
}

async function inspect(page) {
  return page.evaluate((ids) => {
    const of = (id) => document.querySelector(`.elfsight-app-${id}`);
    const describe = (el) =>
      el
        ? {
            present: true,
            height: Math.round(el.getBoundingClientRect().height),
            children: el.childElementCount,
            text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 110),
          }
        : { present: false };

    const mounted = of(ids.mobile) ?? of(ids.desktop);

    return {
      mobile: describe(of(ids.mobile)),
      desktop: describe(of(ids.desktop)),
      reservedMinHeight: mounted
        ? getComputedStyle(mounted.parentElement).minHeight
        : null,
      platformScripts: document.querySelectorAll(
        'script[src*="elfsightcdn.com/platform.js"]',
      ).length,
      // The retired custom carousel left these markers behind.
      customCarouselMarkers: document.querySelectorAll(
        "[data-review-scroller], [data-review-card]",
      ).length,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? 0,
      ),
    };
  }, WIDGET_IDS);
}

async function verify(page, label, expected) {
  console.log(`\n${label}`);
  const rendered = await waitForWidget(page, expected);
  const info = await inspect(page);
  const other = expected === "mobile" ? "desktop" : "mobile";

  check(info[expected].present, `${expected} widget container mounted`);
  check(!info[other].present, `${other} widget container not mounted`);
  check(
    rendered,
    "widget rendered content",
    `height ${info[expected].height ?? 0}px, ${info[expected].children ?? 0} children`,
  );
  check(info.platformScripts === 1, "platform.js injected exactly once", `${info.platformScripts}`);
  check(info.customCarouselMarkers === 0, "no leftover custom carousel markup");
  check(
    Math.abs((info[expected].height ?? 0) - RESERVED_HEIGHT[expected]) <= HEIGHT_TOLERANCE,
    "rendered height still matches the reserved height",
    `rendered ${info[expected].height ?? 0}px vs reserved ${RESERVED_HEIGHT[expected]}px (${info.reservedMinHeight} applied)`,
  );
  check(
    info.documentWidth <= info.viewportWidth + 1,
    "no horizontal overflow",
    `doc ${info.documentWidth}px vs viewport ${info.viewportWidth}px`,
  );
  if (info[expected].text) console.log(`       content: "${info[expected].text}"`);

  // Screenshot the stats + reviews band rather than the page, so the widget's own
  // styling can be compared against the dark band it sits in.
  const slug = label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const band = page
    .locator(`.elfsight-app-${WIDGET_IDS[expected]}`)
    .locator("xpath=ancestor::section[1]");
  await band.screenshot({ path: `${outDir}/${slug}-band.png` });
  console.log(`       screenshot: ${outDir}/${slug}-band.png`);
}

async function openContext(emulation) {
  const context = await browser.newContext({ ...emulation, baseURL: baseUrl });
  const page = await context.newPage();
  page.on("pageerror", (err) => notes.push(`page error: ${err.message.slice(0, 160)}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    notes.push(`console error: ${msg.text().slice(0, 160)}`);
  });
  return { context, page };
}

// 1-3. Hard loads of both pages at both viewports.
for (const [label, emulation, expected] of [
  ["Homepage desktop", { viewport: desktopViewport }, "desktop"],
  ["Homepage mobile", phone, "mobile"],
  ["Gallery desktop", { viewport: desktopViewport }, "desktop"],
  ["Gallery mobile", phone, "mobile"],
]) {
  const { context, page } = await openContext(emulation);
  await page.goto(label.startsWith("Homepage") ? "/" : "/gallery", {
    waitUntil: "load",
    timeout: 90_000,
  });
  await verify(page, `${label} hard load`, expected);
  await context.close();
}

// 4. In-app navigation, there and back. platform.js has already been evaluated by the
// time the second and third containers mount, so this is the path that breaks.
{
  const { context, page } = await openContext({ viewport: desktopViewport });
  await page.goto("/", { waitUntil: "load", timeout: 90_000 });
  await verify(page, "Homepage before in-app navigation", "desktop");

  await page.locator('a[href="/gallery"]').first().click();
  await page.waitForURL("**/gallery", { timeout: 30_000 });
  await verify(page, "Gallery after in-app navigation", "desktop");

  await page.locator('header a[href="/"]').first().click();
  await page.waitForURL((url) => new URL(url).pathname === "/", { timeout: 30_000 });
  await verify(page, "Homepage after navigating back", "desktop");
  await context.close();
}

// 5. Resizing across the breakpoint swaps to the other Elfsight app mid-session.
{
  const { context, page } = await openContext({ viewport: desktopViewport });
  await page.goto("/", { waitUntil: "load", timeout: 90_000 });
  await verify(page, "Homepage at desktop width before resize", "desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await verify(page, "Homepage after resize to phone width", "mobile");

  await page.setViewportSize(desktopViewport);
  await verify(page, "Homepage after resize back to desktop width", "desktop");
  await context.close();
}

// 6. Elfsight unreachable, as it is for anyone running a script blocker. The reserved
// space has to be handed back or the band shows a ~650px hole where the widget should be.
{
  console.log("\nElfsight blocked (script-blocker / outage)");
  const { context, page } = await openContext({ viewport: desktopViewport });
  await page.route(/elfsight/, (route) => route.abort());
  await page.goto("/", { waitUntil: "load", timeout: 90_000 });

  const reservedHeight = () =>
    page.evaluate(() => {
      const el = document.querySelector('[class*="elfsight-app-"]');
      return el ? Math.round(el.parentElement.getBoundingClientRect().height) : -1;
    });

  let released = false;
  for (let i = 0; i < 20 && !released; i += 1) {
    await page.waitForTimeout(250);
    released = (await reservedHeight()) === 0;
  }
  check(released, "reserved space released within 5s so the band collapses");
  await context.close();
}

console.log("\nRetired route");
const res = await fetch(`${baseUrl}/api/reviews`);
check(res.status === 404, "/api/reviews returns 404", `got ${res.status}`);

await browser.close();

if (notes.length) {
  const unique = [...new Set(notes)];
  console.log(`\nBrowser errors seen (not failures, usually third-party):`);
  for (const note of unique.slice(0, 12)) console.log(`  - ${note}`);
}

console.log(
  failures.length
    ? `\n${failures.length} failure(s):\n${failures.map((f) => `  - ${f}`).join("\n")}`
    : "\nAll checks passed.",
);
process.exit(failures.length ? 1 : 0);
