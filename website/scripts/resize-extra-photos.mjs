import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src/assets/photos");
const DIRS = {
  work: path.resolve("public/images/services/work"),
  gallery: path.resolve("public/images/gallery"),
};

// [sourceRelativePath, outDirKey, outputFileName]
const jobs = [
  // Cameras (commercial / Centex + live monitors)
  ["Centex Petroleum/centex-petroleum-technician-installing-exterior-building-camera.jpg", "work", "camera-centex-exterior-install.jpg"],
  ["Centex Petroleum/centex-petroleum-technicians-ladder-passing-camera-box.jpg", "work", "camera-centex-ladder-team.jpg"],
  ["Centex Petroleum/centex-petroleum-technician-store-cooler-aisle.jpg", "work", "camera-centex-store-walk.jpg"],
  ["2026-06-20/2026-06-20-monitor-cameras.jpg", "work", "camera-monitors-live.jpg"],
  // Networking
  ["2026-06-20/2026-06-20-team-installing-structured-cabling.jpg", "work", "network-multigen-cabling.jpg"],
  ["Centex Petroleum/centex-petroleum-technicians-electrical-panel-network-cabling.jpg", "work", "network-centex-panel-cabling.jpg"],
  // Team
  ["2026-06-20/2026-06-20-technicians-posing-construction-house.jpg", "gallery", "team-construction-house.jpg"],
  ["Centex Petroleum/centex-petroleum-crew-on-rooftop-group.jpg", "gallery", "team-centex-rooftop-group.jpg"],
];

await mkdir(DIRS.work, { recursive: true });
await mkdir(DIRS.gallery, { recursive: true });

let ok = 0;
let failed = 0;
for (const [rel, dirKey, out] of jobs) {
  try {
    const info = await sharp(path.join(SRC_ROOT, rel))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(DIRS[dirKey], out));
    console.log(`OK  ${dirKey}/${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
    ok += 1;
  } catch (err) {
    console.error(`FAIL ${rel} -> ${out}: ${err.message}`);
    failed += 1;
  }
}
console.log(`\nDone. ${ok} ok, ${failed} failed.`);
