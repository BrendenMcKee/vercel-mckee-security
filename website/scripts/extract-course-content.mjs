/**
 * One-time extractor: pulls LearnDash topic HTML from mckeesecurity.ca
 * Run: node scripts/extract-course-content.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../src/content/courses");
const OUT_FILE = join(OUT_DIR, "lesson-content.json");

/** lessonId -> source URL on live WordPress site */
const LESSON_URLS = {
  "mckee-security-technician:0:0:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/vista-20p-series-online-e-learning-3h-5m/topics/vista-20p-essentials-0h-30m/",
  "mckee-security-technician:0:0:1":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/vista-20p-series-online-e-learning-3h-5m/topics/vista-20p-programming-functionality-1h-10m/",
  "mckee-security-technician:0:1:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/vista-20p-series-in-person-training-8h-0m/topics/installation-wire-the-panel-devices/",
  "mckee-security-technician:0:1:1":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/vista-20p-series-in-person-training-8h-0m/topics/programming-program-security-system/",
  "mckee-security-technician:0:1:2":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/vista-20p-series-in-person-training-8h-0m/topics/alarmnet-360-monitoring-account-setup/",
  "mckee-security-technician:1:0:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/proseries-online-e-learning-1h-00m/topics/intro-to-proseries-0h-25m/",
  "mckee-security-technician:1:0:1":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/proseries-online-e-learning-1h-00m/topics/proseries-applications-0h-35m/",
  "mckee-security-technician:1:1:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/proseries-in-person-training-6h-0m/topics/installation-wire-the-proseries-keypad-gather-devices/",
  "mckee-security-technician:1:1:1":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/proseries-in-person-training-6h-0m/topics/alarmnet-360-proseries-monitoring-account-setup/",
  "mckee-security-technician:1:1:2":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/proseries-in-person-training-6h-0m/topics/programming-proseries-program-security-system/",
  "mckee-security-technician:2:0:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/dahua-online-e-learning-0h-30m/topics/nvr-camera-installation-device-setup/",
  "mckee-security-technician:2:1:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/dahua-in-person-training-2h-00m/topics/dahua-camera-nvr-installation/",
  "mckee-security-technician:2:1:1":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/dahua-in-person-training-2h-00m/topics/dahua-nvr-setup-configuration/",
  "mckee-security-technician:3:0:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/starlink-online-e-learning-1h-00m/topics/learn-the-essentials-of-installing-starlink/",
  "mckee-security-technician:3:1:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/starlink-in-person-training-1h-30m/topics/starlink-setup-configuration/",
  "mckee-security-technician:4:0:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/ubiquiti-online-e-learning-1h-00m/topics/learn-the-basics-of-network-administration/",
  "mckee-security-technician:4:1:0":
    "https://mckeesecurity.ca/courses/mckee-security-technician/lessons/ubiquiti-in-person-training-1h-30m/topics/setup-a-complete-wireless-network/",
};

function extractTabContent(html) {
  const open = html.match(/id="ld-tab-content-\d+"[^>]*>/);
  if (!open) return "";
  const start = html.indexOf(open[0]) + open[0].length;
  let depth = 1;
  let i = start;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, nextClose).trim();
      }
      i = nextClose + 6;
    }
  }
  return "";
}

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const output = {};

  for (const [lessonId, url] of Object.entries(LESSON_URLS)) {
    process.stdout.write(`Fetching ${lessonId}...\n`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    const html = await res.text();
    const raw = extractTabContent(html);
    output[lessonId] = {
      sourceUrl: url,
      html: cleanHtml(raw),
    };
  }

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${Object.keys(output).length} lessons to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
