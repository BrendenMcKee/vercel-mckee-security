import sharp from "sharp";
import path from "node:path";

const ASSETS =
  "C:/Users/brend/.cursor/projects/c-Users-brend-OneDrive-Desktop-Vercel-McKee-Security/assets";
const GAL = path.resolve("public/images/gallery");
const WORK = path.resolve("public/images/services/work");

// [sourcePng, outputJpg, { trim }]
const jobs = [
  ["ppe-camera-pole-dome.png", path.join(GAL, "camera-pole-dome-install.jpg")],
  ["ppe-camera-pole-team.png", path.join(WORK, "camera-pole-team-install.jpg")],
  ["ppe-network-antenna-roof.png", path.join(GAL, "network-antenna-roof-install.jpg")],
  ["ppe-network-roof-cable.png", path.join(GAL, "network-roof-cable-route.jpg")],
  ["ppe-network-panel-mast.png", path.join(GAL, "network-panel-antenna-mast.jpg")],
  ["ppe-network-tower-snow.png", path.join(GAL, "network-tower-snow.jpg"), { trim: true }],
  ["ppe-network-tower-climb.png", path.join(GAL, "network-tower-climb.jpg")],
  ["ppe-network-ubiquiti-bridge.png", path.join(WORK, "network-ubiquiti-bridge.jpg")],
  ["ppe-camera-rooftop-ladder.png", path.join(GAL, "camera-rooftop-ladder.jpg")],
  ["ppe-starlink-gable.png", path.join(GAL, "starlink-gable-real.jpg")],
];

for (const [srcName, out, opts = {}] of jobs) {
  let pipeline = sharp(path.join(ASSETS, srcName)).rotate();
  // The tower-snow render letterboxed the tall portrait onto a landscape canvas
  // with flat gray bars; trim them off using the top-left pixel as the bg.
  if (opts.trim) pipeline = pipeline.trim({ threshold: 18 });
  const info = await pipeline
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log(`${path.basename(out)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

// Playful 404 image: the "giant rat" meme in a McKee hoodie.
const memeSrc = path.resolve(
  "src/assets/photos/NEW - Brenden/new-brenden-mckee-hoodie-giant-rat-meme.jpg",
);
const memeOut = path.resolve("public/images/404-rat.jpg");
const memeInfo = await sharp(memeSrc)
  .rotate()
  .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(memeOut);
console.log(`404-rat.jpg  ${memeInfo.width}x${memeInfo.height}  ${Math.round(memeInfo.size / 1024)} KB`);
