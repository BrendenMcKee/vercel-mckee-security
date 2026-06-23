import https from "node:https";

const pages = [
  "dect-phone-w70b",
  "dect-phone-w78h",
  "ip-phone-t53w",
  "ip-phone-t57w",
  "ip-phone-t88",
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(new URL(res.headers.location, url).href).then(resolve).catch(reject);
          return;
        }
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

for (const slug of pages) {
  const html = await fetchText(`https://www.yealink.com/en/product-detail/${slug}`);
  const matches = [...html.matchAll(/https:\/\/www\.yealink\.com\/website-service\/attachment\/product\/image\/[^"'\s)]+/g)].map(
    (m) => m[0],
  );
  const unique = [...new Set(matches)];
  console.log(`\n${slug} (${unique.length})`);
  unique.slice(0, 8).forEach((u) => console.log(u));
}
