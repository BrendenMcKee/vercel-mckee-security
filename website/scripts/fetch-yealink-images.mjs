import https from "node:https";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/images/services/voip");

const downloads = [
  {
    file: "w70b-base.png",
    url: "https://www.yealink.com/website-service/attachment/product/image/20220616/20220616062455837d6232de64f81b5a9447601d72fc1.png",
  },
  {
    file: "w78h-handset.png",
    url: "https://www.yealink.com/website-service/attachment/product/image/20241126/202411260259214250a51.png",
  },
  {
    file: "t53w-desk.png",
    url: "https://www.yealink.com/website-service/attachment/product/image/20220412/20220412020132278ab7ca16b4692bf93aa36a47b72f5.png",
  },
  {
    file: "t57w-desk.png",
    url: "https://www.yealink.com/website-service/attachment/product/image/20220411/20220411111600969cee84c104fc0900ff620b3acc6cf.png",
  },
  {
    file: "t88v-desk.png",
    url: "https://www.yealink.com/website-service/attachment/product/image/20250826/202508260642223705125.png",
  },
  {
    file: "voip-hero.jpg",
    url: "https://www.yealink.com/website-service/attachment/product/image/20241126/202411260259214250a51.png",
    jpeg: true,
    maxWidth: 1200,
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(new URL(res.headers.location, url).href).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} -> HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

await mkdir(OUT, { recursive: true });

for (const job of downloads) {
  const buf = await fetchBuffer(job.url);
  const outPath = path.join(OUT, job.file);
  if (job.jpeg) {
    const jpeg = await sharp(buf)
      .rotate()
      .resize({ width: job.maxWidth ?? 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await writeFile(outPath, jpeg);
    console.log(`${job.file}: ${Math.round(jpeg.length / 1024)}KB`);
  } else {
    const png = await sharp(buf)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ quality: 80, effort: 10, compressionLevel: 9 })
      .toBuffer();
    await writeFile(outPath, png);
    console.log(`${job.file}: ${Math.round(png.length / 1024)}KB`);
  }
}
