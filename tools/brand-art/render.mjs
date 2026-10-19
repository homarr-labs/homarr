// node render.mjs [1 2 …]  → out/concept-N.png from concepts.html?c=N (1280×640 at 2×)
// node render.mjs sheet    → out/concepts-overview.png, every rendered concept side by side
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  const file = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const body = await readFile(file).catch(() => null);
  if (!body) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;

const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 640);
const ids = process.argv.slice(2);
const CONCEPTS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const unknown = ids.find((id) => id !== "sheet" && !CONCEPTS.includes(id));
if (unknown) throw new Error(`unknown concept: ${unknown}`);
const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none"],
});
await mkdir(join(root, "out"), { recursive: true });
if (ids[0] === "sheet") {
  const page = await browser.newPage({ viewport: { width: 2680, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/sheet.html`);
  await page.evaluate(() => window.__ready);
  await page.screenshot({ path: join(root, "out/concepts-overview.png"), fullPage: true });
  ids.length = 0;
}
for (const c of ids.length || process.argv[2] === "sheet" ? ids : CONCEPTS.slice(1)) {
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: Number(process.env.SCALE ?? 2),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e));
  await page.goto(`http://127.0.0.1:${port}/concepts.html?c=${c}&w=${W}&h=${H}`);
  await page.evaluate(() => window.__ready);
  if (errors.length) throw new Error(`concept ${c} failed: ${errors.map((e) => e.message).join("; ")}`);
  const f = join(root, `out/concept-${c}.png`);
  await page.screenshot({ path: f });
  console.log(f);
  await page.close();
}
await browser.close();
server.close();
