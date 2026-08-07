import https from "node:https";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/images/services/voip");

// Official Yealink product renders. The desk phone sources are the transparent
// cutouts Yealink publishes for the current T7X/T8X lineup; the T73/T74/T85W
// cutouts only exist at catalogue-thumbnail size, which is why the card assets
// below are re-composed onto a shared canvas rather than used as downloaded.
const SOURCE = {
  w70b: "https://www.yealink.com/website-service/attachment/product/image/20220616/20220616062455837d6232de64f81b5a9447601d72fc1.png",
  w78h: "https://www.yealink.com/website-service/attachment/product/image/20241126/202411260259214250a51.png",
  t73: "https://www.yealink.com/website-service/attachment/product/image/20251031/20251031084427260c411.png",
  t74: "https://www.yealink.com/website-service/attachment/product/image/20251031/202510310836053687e4f.png",
  t85w: "https://www.yealink.com/website-service/attachment/product/image/20251031/202510310824388820115.png",
  t88wPro: "https://www.yealink.com/website-service/attachment/product/image/20251103/20251103080852515bd56.png",
  t88vPro: "https://www.yealink.com/website-service/attachment/product/image/20250826/202508260642223705125.png",
};

// Equipment-grid cards share one canvas so all four tiers render at an
// identical box size; service-row and pricing-card photos are 2:1 to match the
// DECT photos they sit beside.
const CARD = { width: 720, height: 560, padX: 40, padY: 45 };
const WIDE = { width: 900, height: 450, padX: 40, padY: 30 };

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(new URL(res.headers.location, url).href).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} -> HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function centreOnCanvas(buf, { width, height, padX, padY }) {
  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 1 }).toBuffer();
  const phone = await sharp(trimmed)
    .resize({
      width: width - padX * 2,
      height: height - padY * 2,
      fit: "inside",
      kernel: "lanczos3",
    })
    .sharpen({ sigma: 0.7 })
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: phone, gravity: "center" }])
    .png({ quality: 80, effort: 10, compressionLevel: 9 })
    .toBuffer();
}

// Studio-style hero plate: the T88V Pro cutout over a dark backdrop that matches
// the page's own background rather than punching a transparent hole in it.
async function heroPlate(buf) {
  const width = 1200;
  const height = 630;
  const backdrop = Buffer.from(`<svg width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#15171b"/>
        <stop offset="55%" stop-color="#0d0f12"/>
        <stop offset="100%" stop-color="#060708"/>
      </linearGradient>
      <radialGradient id="halo" cx="50%" cy="46%" r="52%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
        <stop offset="70%" stop-color="#ffffff" stop-opacity="0.03"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="floor" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#halo)"/>
    <ellipse cx="${width / 2}" cy="${height * 0.9}" rx="${width * 0.3}" ry="${height * 0.06}" fill="url(#floor)"/>
  </svg>`);

  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 1 }).toBuffer();
  const phone = await sharp(trimmed)
    .resize({
      width: Math.round(width * 0.64),
      height: Math.round(height * 0.8),
      fit: "inside",
      kernel: "lanczos3",
    })
    .toBuffer();
  const phoneMeta = await sharp(phone).metadata();

  return sharp(backdrop)
    .composite([
      {
        input: phone,
        left: Math.round((width - phoneMeta.width) / 2),
        top: Math.round(height * 0.53 - phoneMeta.height / 2),
      },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

async function plainPng(buf, maxWidth = 1200) {
  return sharp(buf)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ quality: 80, effort: 10, compressionLevel: 9 })
    .toBuffer();
}

await mkdir(OUT, { recursive: true });

const sources = Object.fromEntries(
  await Promise.all(Object.entries(SOURCE).map(async ([k, url]) => [k, await fetchBuffer(url)])),
);

const outputs = {
  // Residential DECT
  "w70b-base.png": await plainPng(sources.w70b),
  "w78h-handset.png": await plainPng(sources.w78h),
  "voip-hero.jpg": await sharp(sources.w78h)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer(),

  // Four-tier commercial desk phone cards
  "t73-desk.png": await centreOnCanvas(sources.t73, CARD),
  "t74-desk.png": await centreOnCanvas(sources.t74, CARD),
  "t85w-desk.png": await centreOnCanvas(sources.t85w, CARD),
  "t88w-pro-desk.png": await centreOnCanvas(sources.t88wPro, CARD),

  // 2:1 crops for the service row and the commercial pricing card
  "t85w-wide.png": await centreOnCanvas(sources.t85w, WIDE),
  "t88w-pro-wide.png": await centreOnCanvas(sources.t88wPro, WIDE),

  // Page hero
  "t88v-hero.jpg": await heroPlate(sources.t88vPro),
};

for (const [file, buf] of Object.entries(outputs)) {
  await writeFile(path.join(OUT, file), buf);
  console.log(`${file}: ${Math.round(buf.length / 1024)}KB`);
}
