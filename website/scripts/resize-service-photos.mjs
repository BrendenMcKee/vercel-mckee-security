import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_ROOT = path.resolve("src/assets/photos");
const OUT_ROOT = path.resolve("public/images/services/work");

// [sourceRelativePath, outputFileName]
const jobs = [
  // Security
  ["NEW - Brenden/new-brenden-technician-assembling-alarm-panel.jpg", "security-panel-build.jpg"],
  ["NEW - Brenden/new-brenden-technician-wiring-alarm-panel.jpg", "security-panel-wiring.jpg"],
  ["NEW - Brenden/new-brenden-alarm-panel-unifi-wall-install.jpg", "security-panel-install.jpg"],
  ["NEW - Brenden/new-brenden-technician-alarm-keypad-assembly.jpg", "security-keypad.jpg"],
  ["NEW - Brenden/new-brenden-premises-protected-sign-house.jpg", "security-yard-sign.jpg"],
  ["2026-06-20/2026-06-20-technicians-posing-construction-house.jpg", "security-team-onsite.jpg"],

  // Camera Surveillance
  ["2026-06-20/2026-06-20-monitor-cameras.jpg", "camera-monitor-wall.jpg"],
  ["Centex Petroleum/centex-petroleum-technician-installing-ceiling-camera.jpg", "camera-ceiling-install.jpg"],
  ["Centex Petroleum/centex-petroleum-technician-installing-exterior-building-camera.jpg", "camera-exterior-install.jpg"],
  ["V2 - NEW - Brenden/v2-new-brenden-technician-unboxing-uniview-cameras.jpg", "camera-uniview-staging.jpg"],
  ["Centex Petroleum/centex-petroleum-crew-mounting-exterior-camera.jpg", "camera-crew-mounting.jpg"],
  ["Centex Petroleum/centex-petroleum-crew-on-rooftop-team.jpg", "camera-commercial-team.jpg"],

  // Networking / Cellular
  ["2026-06-20/2026-06-20-team-cat6-cabling-equipment-room.jpg", "network-cat6-equipment-room.jpg"],
  ["NEW - Brenden/new-brenden-technician-holding-ubiquiti-antenna-rooftop.jpg", "network-ubiquiti-bridge.jpg"],
  ["Centex Petroleum/centex-petroleum-crew-smiling-cat6-electrical-panel.jpg", "network-cat6-panel.jpg"],
  ["NEW - Brenden/new-brenden-network-rack-patch-panel-ups.jpg", "network-rack.jpg"],
  ["NEW - Brenden/new-brenden-structured-wiring-board-unifi.jpg", "network-unifi-board.jpg"],
  ["NEW - Brenden/new-brenden-technician-crimping-network-cable-bench.jpg", "network-crimping.jpg"],

  // Audio / Video
  ["OLD - Brenden/old-brenden-outdoor-tv-lakeside-patio.jpg", "av-outdoor-tv-lakeside.jpg"],
  ["OLD - Brenden/old-brenden-outdoor-tv-wall-mount-patio.jpg", "av-outdoor-tv-mount.jpg"],
  ["OLD - Brenden/old-brenden-outdoor-tv-tennis-broadcast.jpg", "av-outdoor-tv-tennis.jpg"],
  ["OLD - Brenden/old-brenden-outdoor-tv-mounted-trees.jpg", "av-outdoor-tv-trees.jpg"],
  ["NEW - Brenden/new-brenden-team-meeting-system-design-laptop.jpg", "av-system-design.jpg"],

  // Starlink
  ["OLD - Brenden/old-brenden-technician-mounting-starlink-dish.jpg", "starlink-mounting.jpg"],
  ["OLD - Brenden/old-brenden-starlink-dish-pole-lakefront.jpg", "starlink-lakefront-pole.jpg"],
  ["OLD - Brenden/old-brenden-technician-installing-starlink-dish-gable.jpg", "starlink-gable-install.jpg"],
  ["OLD - Brenden/old-brenden-starlink-dish-dock-post-lake.jpg", "starlink-dock.jpg"],
  ["NEW - Brenden/new-brenden-starlink-dish-roof-peak.jpg", "starlink-roof-peak.jpg"],
  ["OLD - Brenden/old-brenden-starlink-dish-eave-modern-home.jpg", "starlink-eave-modern.jpg"],
];

await mkdir(OUT_ROOT, { recursive: true });

let ok = 0;
let failed = 0;
for (const [rel, out] of jobs) {
  const srcPath = path.join(SRC_ROOT, rel);
  const outPath = path.join(OUT_ROOT, out);
  try {
    const info = await sharp(srcPath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(outPath);
    const kb = Math.round((info.size / 1024) * 10) / 10;
    console.log(`OK  ${out}  ${info.width}x${info.height}  ${kb} KB`);
    ok += 1;
  } catch (err) {
    console.error(`FAIL ${rel} -> ${out}: ${err.message}`);
    failed += 1;
  }
}
console.log(`\nDone. ${ok} ok, ${failed} failed.`);
