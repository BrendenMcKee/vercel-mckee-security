import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src/assets/photos");
const OUT = path.resolve("public/images/services/work");

const jobs = [
  ["NEW - Brenden/new-brenden-technician-terminating-cat6-connector.jpg", "network-cat6-termination.jpg"],
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
