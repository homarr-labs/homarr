// Screenshots reel times (seconds): node preview.mjs 21.4 23.05 -> preview/t_21.400.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const times = process.argv.slice(2).map(Number);
mkdirSync("preview", { recursive: true });
const browser = await chromium.launch({
  args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(new URL("index.html", import.meta.url).href);
await page.evaluate(() => window.ready);
for (const t of times) {
  const t0 = Date.now();
  await page.evaluate((t) => window.renderFrame(t), t);
  await page.screenshot({ path: `preview/t_${t.toFixed(3)}.png` });
  console.log("t", t, Date.now() - t0, "ms");
}
await browser.close();
