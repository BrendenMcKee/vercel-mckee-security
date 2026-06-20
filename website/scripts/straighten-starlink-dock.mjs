import sharp from "sharp";
import path from "node:path";

const SRC = path.resolve(
  "src/assets/photos/OLD - Brenden/old-brenden-starlink-dish-dock-post-lake.jpg",
);
const OUT = path.resolve("public/images/services/work/starlink-dock-straight.jpg");

// Positive = clockwise. Tune this to level the horizon / plumb the post.
const angle = Number(process.env.ANGLE ?? 2.6);
// Fraction of height kept from the TOP after de-bordering (drops foreground to "bring the dish up").
const keepTop = Number(process.env.KEEPTOP ?? 0.84);

// Apply EXIF orientation first so the small straightening angle is applied to the upright image.
const uprightBuf = await sharp(SRC).rotate().toBuffer({ resolveWithObject: true });
const W = uprightBuf.info.width;
const H = uprightBuf.info.height;

const rotBuf = await sharp(uprightBuf.data)
  .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer({ resolveWithObject: true });
const RW = rotBuf.info.width;
const RH = rotBuf.info.height;

const theta = (Math.abs(angle) * Math.PI) / 180;
const dx = Math.ceil(H * Math.sin(theta)) + 4;
const dy = Math.ceil(W * Math.sin(theta)) + 4;
const cw = W - 2 * dx;
const chFull = H - 2 * dy;
const left = Math.round((RW - cw) / 2);
const top = Math.round((RH - chFull) / 2);
const ch = Math.round(chFull * keepTop);

await sharp(rotBuf.data)
  .extract({ left, top, width: cw, height: ch })
  .resize({ width: 900 })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(OUT);

console.log(`src ${W}x${H}  rot ${RW}x${RH}  crop ${cw}x${ch}  angle ${angle} keepTop ${keepTop}`);
