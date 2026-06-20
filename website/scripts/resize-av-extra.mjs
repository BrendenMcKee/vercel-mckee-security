import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src/assets/photos");
const OUT = path.resolve("public/images/services/work");

const jobs = [
  ["2026-06-20/2026-06-20-team-planning-meeting-office.jpg", "av-system-design.jpg"],
];

await mkdir(OUT, { recursive: true });

for (const [rel, out] of jobs) {
  const info = await sharp(path.join(SRC_ROOT, rel))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(OUT, out));
  console.log(`OK  ${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
