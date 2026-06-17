import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/content/elementor");
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const ctaMatch = d.html.match(
    /class="[^"]*cta[^"]*"[^>]*>\s*<h3>([^<]+)<\/h3>\s*<p>([\s\S]*?)<\/p>/i,
  );
  if (ctaMatch) {
    const text = ctaMatch[2].replace(/<[^>]+>/g, "").trim().slice(0, 200);
    console.log(file, { title: ctaMatch[1], text });
  } else {
    console.log(file, "no match", d.ctaTitle);
  }
}
