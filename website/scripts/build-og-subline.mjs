import sharp from "sharp";
import { join } from "node:path";

const root = join(process.cwd(), "public/images");
const rowHeight = 88;

const andSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120">
  <text x="0" y="92" font-size="86" font-weight="700" fill="#ffffff" font-family="Times New Roman, Georgia, serif">and </text>
</svg>`);

const [andBuf, audioBuf, leafBuf] = await Promise.all([
  sharp(andSvg).png().resize({ height: rowHeight }).toBuffer(),
  sharp(join(root, "og-logo-audio-systems.png")).resize({ height: rowHeight }).toBuffer(),
  sharp(join(root, "og-logo-leaf.png")).resize({ height: rowHeight }).toBuffer(),
]);

const andMeta = await sharp(andBuf).metadata();
const audioMeta = await sharp(audioBuf).metadata();
const leafMeta = await sharp(leafBuf).metadata();
const gap = 12;
const width =
  (andMeta.width ?? 0) + (audioMeta.width ?? 0) + (leafMeta.width ?? 0) + gap;

await sharp({
  create: {
    width,
    height: rowHeight,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  },
})
  .composite([
    { input: andBuf, left: 0, top: 0 },
    { input: audioBuf, left: andMeta.width ?? 0, top: 0 },
    {
      input: leafBuf,
      left: (andMeta.width ?? 0) + (audioMeta.width ?? 0) + gap,
      top: 0,
    },
  ])
  .png()
  .toFile(join(root, "og-wordmark-subline.png"));

console.log(`og-wordmark-subline.png ${width}x${rowHeight}`);
