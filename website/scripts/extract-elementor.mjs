/**
 * Extract Elementor HTML fragments and CSS from WordPress audit HTML files.
 * Run: node scripts/extract-elementor.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const auditDir = path.join(root, "..", "audit", "raw");
const stylesDir = path.join(root, "src", "styles");
const contentDir = path.join(root, "src", "content", "elementor");

const imageMap = {
  "https://mckeesecurity.ca/wp-content/uploads/2020/09/Wireless-SecPk-4.jpg":
    "/images/services/security-wireless.jpg",
  "https://mckeesecurity.ca/wp-content/uploads/2020/09/Wired-SecPk-2.jpg":
    "/images/services/security-wired.jpg",
  "https://mckeesecurity.ca/wp-content/uploads/2020/09/Wireless-SecPk-1.jpg":
    "/images/services/security-wireless.jpg",
  "https://mckeesecurity.ca/wp-content/uploads/2025/12/facilities.jpg":
    "/images/services/security-facilities.jpg",
  "https://mckeesecurity.ca/wp-content/uploads/2025/12/TC2.0.png":
    "/images/services/total-connect.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/Black-Cameras.png":
    "/images/services/cameras.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/White-Cameras.png":
    "/images/services/cameras-white.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/PTZ.png":
    "/images/services/cameras-ptz.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/NVRs.png":
    "/images/services/cameras-nvr.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/Gateways.png":
    "/images/services/gateways.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/Access-Points.png":
    "/images/services/networking.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/Switches.png":
    "/images/services/switches.png",
  "https://mckeesecurity.ca/wp-content/uploads/2025/11/Building-Bridges.png":
    "/images/services/building-bridges.png",
  "https://mckeesecurity.ca/wp-content/uploads/2021/03/Star-28-min.jpg":
    "/images/services/starlink.jpg",
  "https://mckeesecurity.ca/wp-content/uploads/2026/02/Pre-Wire-topaz.jpg":
    "/images/services/pre-wire-topaz.jpg",
};

function replaceUrls(html) {
  let out = html;
  for (const [from, to] of Object.entries(imageMap)) {
    out = out.split(from).join(to);
  }
  return out;
}

function extractCss(html, marker) {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const styleStart = html.lastIndexOf("<style>", idx) + 7;
  const styleEnd = html.indexOf("</style>", styleStart);
  if (styleStart < 7 || styleEnd === -1) return null;
  return html.slice(styleStart, styleEnd);
}

function extractBetween(html, start, endMarker) {
  const s = html.indexOf(start);
  if (s === -1) return null;
  const e = html.indexOf(endMarker, s);
  if (e === -1) return null;
  return html.slice(s, e);
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function save(name, css, html, meta) {
  if (css) {
    fs.writeFileSync(
      path.join(stylesDir, `${name}.css`),
      replaceUrls(css),
    );
  }
  fs.writeFileSync(
    path.join(contentDir, `${name}.json`),
    JSON.stringify({ ...meta, html: replaceUrls(stripScripts(html)) }, null, 2),
  );
  console.log(`Saved ${name}`);
}

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(stylesDir, { recursive: true });

const securityHtml = fs.readFileSync(path.join(auditDir, "security.html"), "utf8");
const camHtml = fs.readFileSync(path.join(auditDir, "camera-surveillance.html"), "utf8");
const netHtml = fs.readFileSync(
  path.join(auditDir, "networking-cellular-expansion.html"),
  "utf8",
);
const audioHtml = fs.readFileSync(path.join(auditDir, "audio-video.html"), "utf8");
const starlinkHtml = fs.readFileSync(path.join(auditDir, "starlink.html"), "utf8");

// Security main content (before monitoring tiers block)
const secMain = extractBetween(
  securityHtml,
  '<div id="mks2025-sec-wrapper">',
  "<!-- Blocks should be inserted",
);
save(
  "security",
  extractCss(securityHtml, "Unique prefix: mks2025-sec-"),
  secMain ?? "",
  {
    wrapperId: "mks2025-sec-wrapper",
    mainId: "mks2025-sec-main",
    particleClass: "mks2025-sec-particles-container",
    ctaSectionClass: "mks2025-sec-cta-section",
    formWrapperClass: "mks2025-sec-contact-form-wrapper",
    ctaTitle: "Ready to protect what matters most?",
    ctaText: "Contact us for a free consultation and custom security system quote.",
    includeMonitoring: true,
  },
);

// Camera: content before contact form
const camMain = extractBetween(
  camHtml,
  '<div id="mks2025-cam-wrapper">',
  '<div class="mks2025-cam-contact-form-wrapper">',
);
save(
  "camera-surveillance",
  extractCss(camHtml, "Unique prefix: mks2025-cam-"),
  (camMain ?? "") +
    '<div class="mks2025-cam-cta-section"><h3>Ready to enhance your security with professional cameras?</h3><p>Contact us for a free consultation and custom camera system quote.</p><div class="mks2025-cam-contact-form-wrapper" data-mckee-form="true"></div></div></div></div>',
  {
    wrapperId: "mks2025-cam-wrapper",
    mainId: "mks2025-cam-main",
    particleClass: "mks2025-cam-particles-container",
    formWrapperClass: "mks2025-cam-contact-form-wrapper",
  },
);

const netMain = extractBetween(
  netHtml,
  '<div id="mks2025-net-wrapper">',
  '<div class="mks2025-net-contact-form-wrapper">',
);
const netCtaMatch = netHtml.match(
  /class="mks2025-net-cta-section"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/,
);
save(
  "networking-cellular-expansion",
  extractCss(netHtml, "Unique prefix: mks2025-net-"),
  (netMain ?? "") +
    `<div class="mks2025-net-cta-section"><h3>${netCtaMatch?.[1]?.trim() ?? "Ready to upgrade your network?"}</h3><p>${netCtaMatch?.[1]?.trim() ? netCtaMatch[2].trim() : "Contact us for a free consultation and custom networking quote."}</p><div class="mks2025-net-contact-form-wrapper" data-mckee-form="true"></div></div></div></div>`,
  {
    wrapperId: "mks2025-net-wrapper",
    mainId: "mks2025-net-main",
    particleClass: "mks2025-net-particles-container",
    formWrapperClass: "mks2025-net-contact-form-wrapper",
  },
);

const audioMain = extractBetween(
  audioHtml,
  '<div class="mckee-audio-wrapper">',
  '<div class="contact-form-wrapper">',
);
const audioCta = audioHtml.match(
  /class="cta-section"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/,
);
save(
  "audio-video",
  extractCss(audioHtml, ".mckee-audio-wrapper"),
  (audioMain ?? "") +
    `<div class="cta-section"><h3>${audioCta?.[1]?.trim() ?? "Ready for premium audio and video?"}</h3><p>${audioCta?.[2]?.trim() ?? "Contact us for a free consultation."}</p><div class="contact-form-wrapper" data-mckee-form="true"></div></div></div>`,
  {
    wrapperId: "mckee-audio-wrapper",
    mainId: "mckee-audio-block",
    particleClass: "particles-container",
    formWrapperClass: "contact-form-wrapper",
    scopeClass: "mckee-audio-block",
  },
);

const starlinkMain = extractBetween(
  starlinkHtml,
  '<div class="mckee-starlink-wrapper">',
  '<div class="contact-form-wrapper">',
);
const starlinkCta = starlinkHtml.match(
  /class="cta-section"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/,
);
save(
  "starlink",
  extractCss(starlinkHtml, ".mckee-starlink-wrapper"),
  (starlinkMain ?? "") +
    `<div class="cta-section"><h3>${starlinkCta?.[1]?.trim() ?? "Ready for high-speed satellite internet?"}</h3><p>${starlinkCta?.[2]?.trim() ?? "Contact us for professional Starlink installation."}</p><div class="contact-form-wrapper" data-mckee-form="true"></div></div></div>`,
  {
    wrapperId: "mckee-starlink-wrapper",
    mainId: "mckee-starlink-block",
    particleClass: "particles-container",
    formWrapperClass: "contact-form-wrapper",
    scopeClass: "mckee-starlink-block",
  },
);

console.log("Done.");
