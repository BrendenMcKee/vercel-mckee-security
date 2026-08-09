import https from "node:https";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/images/services/voip");

// Official Yealink renders, transparent PNG as published, plus the one
// lifestyle shot we use (a DECT handset on a warehouse floor).
const SOURCE = {
  workplace:
    "https://www.yealink.com/website-service/attachment/product/image/20220616/20220616062455837d6232de64f81b5a9447601d72fc1.png",
  w73p: "https://www.yealink.com/website-service/attachment/product/image/20220413/202204130233056319b1117cd4f1ba3d8f84d984c6290.png",
  w78h: "https://www.yealink.com/website-service/attachment/product/image/20241126/202411260259214250a51.png",
  t88wPro: "https://www.yealink.com/website-service/attachment/product/image/20251103/20251103080852515bd56.png",
  t88vPro: "https://www.yealink.com/website-service/attachment/product/image/20250826/202508260642223705125.png",
};

// Yealink only publishes the T73U/T74U/T85W cutouts at catalogue-thumbnail size
// (~250px), which is far too small for a card and looks soft when upscaled. The
// same renders appear at ~1500px inside the feature banner of each datasheet, so
// take them from there: pull the banner JPEG straight out of the PDF, keep the
// right-hand slice that holds the phone, and key out the white studio backdrop.
const DATASHEET = {
  t73: { url: "https://assets.ringcentral.com/us/datasheet/yealink-t73u.pdf", cropFrom: 0.55 },
  t74: { url: "https://assets.ringcentral.com/us/datasheet/yealink-t74u.pdf", cropFrom: 0.46 },
  t85w: { url: "https://assets.ringcentral.com/us/datasheet/yealink-t85w.pdf", cropFrom: 0.47 },
};

// Equipment-grid cards share one canvas so all four tiers render at an identical
// box size. `.equipment-image` caps at 250x220 CSS px, so 4x that is plenty for
// retina while keeping the padding small enough that the phone fills the card.
const CARD = { width: 1000, height: 880, padX: 30, padY: 34 };

// `.service-visual` is a 350x240 CSS box painted with `background-size: cover`,
// so these have to be filled plates at that exact ratio rather than transparent
// cutouts - a transparent PNG would be cropped by `cover` and would show the
// section background through the row's dark scrim. The rows carry no overlay
// glyph, so every plate is composed on its own centre.
const PLATE = { width: 1050, height: 720 };

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

// Pull the largest DCTDecode (JPEG) image stream out of a PDF. The datasheet
// banners are stored uncompressed-as-JPEG, so they come out byte-identical.
function largestJpegInPdf(pdf) {
  const latin = pdf.toString("latin1");
  let biggest = null;
  const re = /\/Subtype\s*\/Image/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const dictStart = latin.lastIndexOf("<<", m.index);
    const streamIdx = latin.indexOf("stream", m.index);
    if (streamIdx === -1) continue;
    if (!/DCTDecode/.test(latin.slice(dictStart, streamIdx))) continue;
    let dataStart = streamIdx + "stream".length;
    if (latin[dataStart] === "\r") dataStart += 1;
    if (latin[dataStart] === "\n") dataStart += 1;
    const endIdx = latin.indexOf("endstream", dataStart);
    if (endIdx === -1) continue;
    const jpeg = pdf.subarray(dataStart, endIdx);
    if (!biggest || jpeg.length > biggest.length) biggest = jpeg;
  }
  if (!biggest) throw new Error("no JPEG image stream found in PDF");
  return biggest;
}

// Threshold above which a pixel counts as studio backdrop rather than product.
// The phones are charcoal and their light trim is always enclosed by darker
// bodywork, so a flood fill from the border cannot leak inside them.
const BACKDROP_LEVEL = 205;

function floodFillBackdrop(data, width, height, channels) {
  const n = width * height;
  const pale = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const o = i * channels;
    pale[i] = Math.min(data[o], data[o + 1], data[o + 2]) >= BACKDROP_LEVEL ? 1 : 0;
  }

  const backdrop = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (i) => {
    if (!backdrop[i] && pale[i]) {
      backdrop[i] = 1;
      stack[sp] = i;
      sp += 1;
    }
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (sp > 0) {
    sp -= 1;
    const i = stack[sp];
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < n - width) push(i + width);
  }
  return backdrop;
}

// Everything that is not backdrop but is not the phone either (feature icons and
// their captions on the left of the banner) is discarded by keeping only the
// single largest connected blob.
function largestBlob(backdrop, width, height) {
  const n = width * height;
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let current = 0;
  let best = -1;
  let bestSize = 0;

  for (let seed = 0; seed < n; seed += 1) {
    if (backdrop[seed] || label[seed] !== -1) continue;
    let sp = 0;
    let size = 0;
    label[seed] = current;
    stack[sp] = seed;
    sp += 1;
    const push = (i) => {
      if (!backdrop[i] && label[i] === -1) {
        label[i] = current;
        stack[sp] = i;
        sp += 1;
      }
    };
    while (sp > 0) {
      sp -= 1;
      const i = stack[sp];
      size += 1;
      const x = i % width;
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      if (i >= width) push(i - width);
      if (i < n - width) push(i + width);
    }
    if (size > bestSize) {
      bestSize = size;
      best = current;
    }
    current += 1;
  }

  const mask = Buffer.alloc(n);
  for (let i = 0; i < n; i += 1) mask[i] = label[i] === best ? 255 : 0;
  return mask;
}

async function cutOutOfBackdrop(jpeg, cropFrom) {
  const meta = await sharp(jpeg).metadata();
  const left = Math.round(meta.width * cropFrom);
  const { data, info } = await sharp(jpeg)
    .extract({ left, top: 0, width: meta.width - left, height: meta.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const backdrop = floodFillBackdrop(data, width, height, channels);
  const mask = largestBlob(backdrop, width, height);
  const raw = { width, height, channels: 1 };

  // The original silhouette is antialiased against white, so a mask cut exactly
  // on it leaves a pale rim once the phone sits on a dark card. Blur-and-
  // threshold erodes ~2px of that rim away, and the second blur puts a soft edge
  // back so the downscale has something to average.
  // `threshold()` promotes the band to sRGB, so force it back before taking the
  // raw bytes - otherwise `joinChannel` reads three bytes per pixel as one.
  const alpha = await sharp(mask, { raw })
    .blur(2.5)
    .threshold(190)
    .blur(1.1)
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  const rgb = await sharp(data, { raw: info }).removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw })
    .png()
    .toBuffer();
}

// Transparent cutouts ship as WebP: the same canvas is ~180KB as a PNG and
// ~40KB here, and every browser that can run the rest of this site supports it.
async function centreOnCanvas(buf, { width, height, padX, padY }) {
  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 1 }).toBuffer();
  const phone = await sharp(trimmed)
    .resize({
      width: width - padX * 2,
      height: height - padY * 2,
      fit: "inside",
      kernel: "lanczos3",
    })
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: phone, gravity: "center" }])
    .webp({ quality: 88, effort: 6 })
    .toBuffer();
}

function darkBackdrop(width, height, { cx = 0.5, cy = 0.46 } = {}) {
  const pct = (v) => `${Number((v * 100).toFixed(2))}%`;
  return Buffer.from(`<svg width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#15171b"/>
        <stop offset="55%" stop-color="#0d0f12"/>
        <stop offset="100%" stop-color="#060708"/>
      </linearGradient>
      <radialGradient id="halo" cx="${pct(cx)}" cy="${pct(cy)}" r="52%">
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
    <ellipse cx="${cx * width}" cy="${height * 0.9}" rx="${width * 0.3}" ry="${height * 0.06}" fill="url(#floor)"/>
  </svg>`);
}

// Studio plate over a backdrop that matches the page's own dark background
// rather than punching a transparent hole in it.
async function studioPlate(buf, { width, height, scaleW, scaleH, cx = 0.5, cy = 0.5, quality = 86 }) {
  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 1 }).toBuffer();
  const phone = await sharp(trimmed)
    .resize({
      width: Math.round(width * scaleW),
      height: Math.round(height * scaleH),
      fit: "inside",
      kernel: "lanczos3",
    })
    .toBuffer();
  const meta = await sharp(phone).metadata();

  // The halo keeps its own vertical centre: it is the backdrop's key light, not
  // a spotlight that should chase the product up and down the frame.
  return sharp(darkBackdrop(width, height, { cx }))
    .composite([
      {
        input: phone,
        left: Math.round(width * cx - meta.width / 2),
        top: Math.round(height * cy - meta.height / 2),
      },
    ])
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

// A photograph cropped to the `.service-visual` ratio, then dimmed evenly and
// vignetted so it sits at the same brightness as the studio plates in the rows
// around it instead of glaring out of the dark page.
async function photoPlate(buf, { width, height, focusX = 0.5, focusY = 0.5, zoom = 1, dim = 0.2 }) {
  const meta = await sharp(buf).metadata();
  const ratio = width / height;

  // Biggest window of the source that already matches the plate's aspect ratio,
  // tightened by `zoom` and slid so `focus` ends up in the middle of the frame.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cropW = clamp(Math.round(Math.min(meta.width, meta.height * ratio) / zoom), 1, meta.width);
  const cropH = clamp(Math.round(cropW / ratio), 1, meta.height);
  const extract = {
    left: clamp(Math.round(meta.width * focusX - cropW / 2), 0, meta.width - cropW),
    top: clamp(Math.round(meta.height * focusY - cropH / 2), 0, meta.height - cropH),
    width: cropW,
    height: cropH,
  };

  const base = await sharp(buf)
    .extract(extract)
    .resize({ width, height, fit: "cover", kernel: "lanczos3" })
    .toBuffer();

  const grade = Buffer.from(`<svg width="${width}" height="${height}">
    <defs>
      <radialGradient id="vignette" cx="50%" cy="46%" r="75%">
        <stop offset="40%" stop-color="#05070a" stop-opacity="0"/>
        <stop offset="100%" stop-color="#05070a" stop-opacity="0.6"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="#05070a" fill-opacity="${dim}"/>
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  </svg>`);

  return sharp(base)
    .composite([{ input: grade }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

async function photo(buf, { maxWidth = 1200, quality = 84 } = {}) {
  return sharp(buf)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .flatten({ background: "#0d0f12" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

await mkdir(OUT, { recursive: true });

const sources = Object.fromEntries(
  await Promise.all(Object.entries(SOURCE).map(async ([k, url]) => [k, await fetchBuffer(url)])),
);

const cutouts = Object.fromEntries(
  await Promise.all(
    Object.entries(DATASHEET).map(async ([k, { url, cropFrom }]) => [
      k,
      await cutOutOfBackdrop(largestJpegInPdf(await fetchBuffer(url)), cropFrom),
    ]),
  ),
);

const outputs = {
  // Residential DECT row. The W73P plate is the W70B base with a W73H handset in
  // its cradle, which is the kit we actually install in homes - the warehouse
  // lifestyle shot that used to sit here reads as commercial and now runs in the
  // commercial DECT row instead.
  "w73p-dect.jpg": await studioPlate(sources.w73p, {
    ...PLATE,
    scaleW: 0.6,
    scaleH: 0.6,
    cy: 0.52,
  }),

  // Residential home phone row. Yealink ship this one as a lit studio photo
  // rather than a cutout, so it is framed rather than re-composited. The handset
  // sits in the right third of the 1920x964 original and the crop cannot reach
  // past its edge, so this is as centred as the source allows - which leaves the
  // product leaning towards the copy beside it.
  "w78h-plate.jpg": await photoPlate(sources.w78h, {
    ...PLATE,
    focusX: 0.75,
    focusY: 0.56,
    zoom: 1.22,
  }),
  "w78h-handset.jpg": await photo(sources.w78h),

  // Commercial DECT row. The widest crop of the 1920x961 original that still
  // hits the row's ratio, framed on the handset at the subject's ear.
  "dect-workplace.jpg": await photoPlate(sources.workplace, { ...PLATE, focusX: 0.4 }),

  // Four-tier commercial desk phone cards
  "t73-desk.webp": await centreOnCanvas(cutouts.t73, CARD),
  "t74-desk.webp": await centreOnCanvas(cutouts.t74, CARD),
  "t85w-desk.webp": await centreOnCanvas(cutouts.t85w, CARD),
  "t88w-pro-desk.webp": await centreOnCanvas(sources.t88wPro, CARD),

  // Business service row
  "t85w-plate.jpg": await studioPlate(cutouts.t85w, {
    ...PLATE,
    scaleW: 0.62,
    scaleH: 0.6,
    cy: 0.52,
  }),

  // Commercial pricing card. `.card-image` sits on the card's own background, so
  // this one stays a transparent cutout.
  "t88w-pro-card.webp": await centreOnCanvas(sources.t88wPro, {
    width: 900,
    height: 450,
    padX: 30,
    padY: 24,
  }),

  // Page hero, and the card the services hub uses for this page. Stays JPEG at
  // 1200x630: it is the one that ends up in preload hints and share previews.
  "t88v-hero.jpg": await studioPlate(sources.t88vPro, {
    width: 1200,
    height: 630,
    scaleW: 0.64,
    scaleH: 0.8,
    cy: 0.53,
  }),
};

for (const [file, buf] of Object.entries(outputs)) {
  await writeFile(path.join(OUT, file), buf);
  console.log(`${file}: ${Math.round(buf.length / 1024)}KB`);
}
