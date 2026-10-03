import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, renameSync, readFileSync } from "node:fs";

// Renders one warp (see make_warp.py) into resumable 30-frame lossless chunks. The warp maps output time u to reel
// time t; motion blur uses a 180° shutter in output time, with fewer sub-frames where the reel is barely moving.
// Usage: WARP=warp-a.json OUT=chunks-a WORKERS=4 node render.mjs
const FPS = 60,
  SHUTTER = 0.5;
const WORKERS = +(process.env.WORKERS || 6),
  CHUNK = 30;
const OUT = process.env.OUT || "chunks";
const PAGE = process.env.PAGE || "index.html";
const FROM = +(process.env.FROM || 0);
const warp = JSON.parse(readFileSync(process.env.WARP || "warp-a.json", "utf8"));
const T = (u) => {
  const x = Math.max(0, Math.min(warp.duration, u)) / warp.du,
    i = Math.min(warp.t.length - 2, Math.floor(x)),
    f = x - i;
  return warp.t[i] + (warp.t[i + 1] - warp.t[i]) * f;
};
const total = Math.ceil(warp.duration * FPS);
mkdirSync(OUT, { recursive: true });
const queue = [];
for (let a = Math.floor(FROM / CHUNK) * CHUNK; a < total; a += CHUNK) {
  const name = `${OUT}/c_${String(a).padStart(4, "0")}.mkv`;
  if (existsSync(name)) continue;
  const b = Math.min(total, a + CHUNK);
  let vmax = 0;
  for (let f = a; f <= b; f++) vmax = Math.max(vmax, (T((f + 0.5) / FPS) - T((f - 0.5) / FPS)) * FPS);
  queue.push([a, b, name, vmax > 0.3 ? 8 : 4]);
}
console.log("frames", total, "chunks to render:", queue.length);

async function renderChunk(page, cdp, [a, b, name, SUB]) {
  const tmp = name.replace(".mkv", ".part.mkv");
  const ff = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(FPS * SUB),
      "-c:v",
      "png",
      "-i",
      "-",
      "-vf",
      `tmix=frames=${SUB}:weights='${Array(SUB).fill(1).join(" ")}',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`,
      "-r",
      String(FPS),
      "-c:v",
      "libx264rgb",
      "-preset",
      "ultrafast",
      "-qp",
      "0",
      tmp,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((r) => ff.on("close", r));
  for (let f = a; f < b; f++) {
    for (let j = 0; j < SUB; j++) {
      const u = Math.max(0, Math.min(warp.duration - 1e-4, (f + (j - (SUB - 1) / 2) * (SHUTTER / SUB)) / FPS));
      await page.evaluate(([t, u]) => window.renderFrame(t, u), [T(u), u]);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
      if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
    }
  }
  ff.stdin.end();
  await done;
  renameSync(tmp, name);
}

async function worker(k) {
  const browser = await chromium.launch({
    args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--disable-lcd-text"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log(`[w${k}] pageerror`, e.message));
  await page.goto(new URL(PAGE, import.meta.url).href);
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  while (queue.length) {
    const job = queue.shift();
    const t0 = Date.now();
    await renderChunk(page, cdp, job);
    console.log(`[w${k}] ${job[2]} sub=${job[3]} ${((Date.now() - t0) / 1000).toFixed(1)}s (${queue.length} queued)`);
  }
  await browser.close();
}

const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, (_, k) => worker(k)));
console.log("done in", ((Date.now() - t0) / 1000).toFixed(1), "s");
