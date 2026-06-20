import sharp from "sharp";
import { copyFile } from "node:fs/promises";
import path from "node:path";

const ASSETS =
  "C:/Users/brend/.cursor/projects/c-Users-brend-OneDrive-Desktop-Vercel-McKee-Security/assets";
const WORK = path.resolve("public/images/services/work");

const jobs = [
  [path.join(ASSETS, "starlink-gable-ppe.png"), path.join(WORK, "starlink-gable-install.jpg")],
  [path.join(ASSETS, "starlink-mounting-ppe.png"), path.join(WORK, "starlink-mounting.jpg")],
];

for (const [src, out] of jobs) {
  const info = await sharp(src)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log(`${path.basename(out)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

const dock = path.join(WORK, "starlink-dock-straight.jpg");
const dockMeta = await sharp(dock).metadata();
await copyFile(dock, path.join(WORK, "starlink-dock.jpg"));
console.log(`starlink-dock.jpg  ${dockMeta.width}x${dockMeta.height}`);
