import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src/assets/photos");
const OUT_ROOT = path.resolve("public/images/gallery");

// [sourceRelativePath, outputFileName]
const jobs = [
  // Team
  ["V2 - NEW - Brenden/v2-new-brenden-crew-team-group-photo-trucks.jpg", "team-crew-trucks.jpg"],
  ["V2 - NEW - Brenden/v2-new-brenden-team-meeting-office-planning.jpg", "team-office-planning.jpg"],
  ["NEW - Brenden/new-brenden-mckee-security-truck-airfield.jpg", "team-truck-airfield.jpg"],

  // Cameras
  ["OLD - Brenden/old-brenden-technician-mounting-camera-arena-ceiling.jpg", "camera-arena-scissor-lift.jpg"],
  ["OLD - Brenden/old-brenden-dahua-nvr-camera-monitor-display.jpg", "camera-nvr-display.jpg"],
  ["OLD - Brenden/old-brenden-bullet-camera-mounted-tree.jpg", "camera-bullet-tree.jpg"],

  // Networking
  ["NEW - Brenden/new-brenden-technician-climbing-utility-pole.jpg", "network-utility-pole-climb.jpg"],
  ["OLD - Brenden/old-brenden-server-rack-network-switches-cabling.jpg", "network-server-rack.jpg"],
  ["NEW - Brenden/new-brenden-ubiquiti-airmax-antenna-rooftop.jpg", "network-airmax-antenna.jpg"],

  // Starlink
  ["OLD - Brenden/old-brenden-starlink-dish-roof-lake-panorama.jpg", "starlink-lake-panorama.jpg"],
  ["OLD - Brenden/old-brenden-starlink-dish-dock-red-chairs.jpg", "starlink-dock-red-chairs.jpg"],

  // Security
  ["NEW - Brenden/new-brenden-equipment-board-overview.jpg", "security-equipment-board.jpg"],
  ["OLD - Brenden/old-brenden-alarm-panel-circuit-board-wiring.jpg", "security-circuit-board.jpg"],
];

await mkdir(OUT_ROOT, { recursive: true });

let ok = 0;
let failed = 0;
for (const [rel, out] of jobs) {
  try {
    const info = await sharp(path.join(SRC_ROOT, rel))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(OUT_ROOT, out));
    console.log(`OK  ${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
    ok += 1;
  } catch (err) {
    console.error(`FAIL ${rel} -> ${out}: ${err.message}`);
    failed += 1;
  }
}
console.log(`\nDone. ${ok} ok, ${failed} failed.`);
