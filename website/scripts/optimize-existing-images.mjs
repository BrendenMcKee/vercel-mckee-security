import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("public/images");

// [relativePath, maxWidth, kind]
const jobs = [
  ["hero-home.jpg", 2400, "jpg"],
  ["hero-contact.jpg", 2400, "jpg"],
  ["hero-about.jpg", 2400, "jpg"],
  ["team/maurice-mary.jpg", 1200, "jpg"],
  ["services/starlink.jpg", 1600, "jpg"],
  ["services/pre-wire.jpg", 1600, "jpg"],
  ["services/pre-wire-topaz.jpg", 1600, "jpg"],
  ["services/security-wired.jpg", 1600, "jpg"],
  ["services/security-wireless.jpg", 1600, "jpg"],
  ["services/home-theater.png", 1500, "png"],
  ["services/tv-install.png", 1500, "png"],
];

let savedTotal = 0;
for (const [rel, maxWidth, kind] of jobs) {
  const file = path.join(ROOT, rel);
  const input = await readFile(file);
  const before = input.length;
  const pipeline = sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true });
  const buf =
    kind === "png"
      ? await pipeline.png({ quality: 80, effort: 10, compressionLevel: 9 }).toBuffer()
      : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await writeFile(file, buf);
  const after = buf.length;
  savedTotal += before - after;
  console.log(
    `${rel}  ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB`,
  );
}
console.log(`\nSaved ~${Math.round(savedTotal / 1024 / 1024 * 10) / 10} MB total.`);
