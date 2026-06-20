import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("src/assets/wp-downloads");
const AV = path.resolve("public/images/services/av");
const STAR = path.resolve("public/images/services/starlink");

await mkdir(AV, { recursive: true });
await mkdir(STAR, { recursive: true });

// Product renders: light background, modest size is plenty.
const products = [
  ["arcultra-anglehero-black.jpg", AV, "arc-ultra.jpg", 1000],
  ["ray-hero-black.jpg", AV, "ray.jpg", 1000],
  ["sub4-front-black.jpg", AV, "sub4.jpg", 1000],
  ["era-100-front-white.jpg", AV, "era-100.jpg", 1000],
  ["era-300-side-angle-white.jpg", AV, "era-300.jpg", 1000],
  ["move2-front-black.jpg", AV, "move2.jpg", 1000],
  ["Sonos_Amp_White_03-1.jpg", AV, "sonos-amp.jpg", 1000],
  ["Sonance_In-Ceiling-Product_Render-Component_View.jpg", AV, "sonance-in-ceiling.jpg", 1000],
  ["Sonance_In-Wall-Product_Render-Component_View.jpg", AV, "sonance-in-wall.jpg", 1000],
  ["Sonance_Group_with_Amp-Product_Render-Dark_Walls.jpg", AV, "sonance-outdoor.jpg", 1000],
  ["Our_STARLINK_Mounting_Kit.jpg", STAR, "mounting-kit.jpg", 1000],
  ["Our_Gen3_Starlink_150ft_Cable.jpg", STAR, "cable-150ft.jpg", 1000],
];

// Scene image kept as a representative background.
const scenes = [["Home_Theater.png", AV, "home-theater.jpg", 1400]];

const jobs = [...products, ...scenes];

let ok = 0;
for (const [src, outDir, out, width] of jobs) {
  const info = await sharp(path.join(SRC, src))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outDir, out));
  const kb = Math.round((info.size / 1024) * 10) / 10;
  console.log(`OK ${out}  ${info.width}x${info.height}  ${kb} KB`);
  ok += 1;
}
console.log(`\nDone. ${ok} files.`);
