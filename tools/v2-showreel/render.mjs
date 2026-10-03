// Frame-accurate renderer: seeks the page to each frame time and captures it.
//   bun render.mjs stills 1 2.5 front-door@3  → out/stills/*.png (scene@t = authored scene time)
//   bun render.mjs video [--from a] [--to b] [--workers 3] [--fps 60] [--sub 1] [--chunk 120] [--recycle 6]
//     resumable: finished chunks in out/seg are skipped; delete out/seg to start over
//   bun render.mjs cues                      → out/cues.json
//   bun render.mjs lobster outro@3 [name]    → out/recap/frames/<name>.png (the 3D logo alone, transparent)
//   bun render.mjs recap [1 2 3 4]           → out/recap/homarr-v2-recap-N.png from recap/index.html?v=N
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename, symlink } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { extname, join, resolve } from "node:path";
import os from "node:os";

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

function serve() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const file = join(root, path === "/" ? "index.html" : path);
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => ok(server));
  });
}

function findChrome() {
  const base = join(os.homedir(), ".cache/ms-playwright");
  const dirs = readdirSync(base)
    .filter((d) => d.startsWith("chromium-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const p = join(base, d, "chrome-linux64/chrome");
    if (existsSync(p)) return p;
  }
  throw new Error("no chromium");
}

// Shared server: pause (between frames) while RAM or CPU headroom is low instead of pushing it into swap.
const MIN_FREE = Number(process.env.MIN_FREE ?? 0.12); // fraction of RAM that must stay available
const MAX_LOAD = Number(process.env.MAX_LOAD ?? 0.9); // 1-minute load per core
function headroom() {
  const mi = readFileSync("/proc/meminfo", "utf8");
  const kb = (k) => Number(mi.match(new RegExp(`^${k}:\\s+(\\d+)`, "m"))[1]);
  return { mem: kb("MemAvailable") / kb("MemTotal"), load: os.loadavg()[0] / os.cpus().length };
}
async function waitForHeadroom() {
  for (let warned = false; ; warned = true) {
    const h = headroom();
    if (h.mem >= MIN_FREE && h.load <= MAX_LOAD) return;
    if (!warned) console.error(`\npaused: ${(h.mem * 100).toFixed(0)}% RAM available, load ${(h.load * 100).toFixed(0)}% per core`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function openPage(port, path = "index.html") {
  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--font-render-hinting=none",
      "--disable-lcd-text",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      // Software compositing is ~5x faster than SwiftShader GPU compositing here and renders identically.
      "--disable-gpu-compositing",
      ...(process.env.EXTRA_ARGS ? process.env.EXTRA_ARGS.split(" ") : []),
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(process.env.SCALE ?? 1) });
  page.on("pageerror", (e) => console.error("[page]", e.message));
  page.on("console", (m) => m.type() === "error" && console.error("[console]", m.text()));
  await page.goto(`http://127.0.0.1:${port}/${path}`);
  await page.evaluate(() => window.__ready);
  return { browser, page };
}

const args = process.argv.slice(2);
const mode = args[0];
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};

const server = await serve();
const port = server.address().port;

if (mode === "stills") {
  await mkdir(join(root, "out/stills"), { recursive: true });
  const { browser, page } = await openPage(port);
  // PATCH='{"waveR":0.6}' overrides the logo pose, for inspecting the rig.
  if (process.env.PATCH) await page.evaluate((p) => (window.__logoPatch = p), JSON.parse(process.env.PATCH));
  // CLEAN=1 drops the vignette and grain, for stills that get cropped into other layouts.
  if (process.env.CLEAN) await page.addStyleTag({ content: "#fx{display:none}" });
  // Accepts global seconds or scene@local (authored scene time, e.g. front-door@12.5).
  for (const arg of args.slice(1)) {
    const [name, lt] = arg.includes("@") ? arg.split("@") : [null, arg];
    const t = name ? await page.evaluate(([n, x]) => window.__at(n, x), [name, Number(lt)]) : Number(lt);
    await page.evaluate((x) => window.__seek(x), t);
    const label = (process.env.TAG ?? "") + (name ? `${name}@${Number(lt).toFixed(2)}` : `t${t.toFixed(2).padStart(7, "0")}`);
    const f = join(root, `out/stills/${label}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
} else if (mode === "eval") {
  // bun render.mjs eval <scene@t|t> "<js expression>"  → prints the result after seeking
  const { browser, page } = await openPage(port);
  const [name, lt] = args[1].includes("@") ? args[1].split("@") : [null, args[1]];
  const t = name ? await page.evaluate(([n, x]) => window.__at(n, x), [name, Number(lt)]) : Number(lt);
  await page.evaluate((x) => window.__seek(x), t);
  console.log(JSON.stringify(await page.evaluate(args[2]), null, 1));
  await browser.close();
} else if (mode === "prof") {
  const { browser, page } = await openPage(port);
  const cdp = await page.context().newCDPSession(page);
  for (const T of [60, 60.02, 100, 100.02, 150, 150.02, 180, 205]) {
    const a = performance.now();
    await page.evaluate((x) => window.__seek(x), T);
    const b = performance.now();
    const inner = await page.evaluate((x) => { const s = performance.now(); window.__seek(x); document.body.offsetHeight; return performance.now() - s; }, T + 0.01);
    const c = performance.now();
    await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
    const d = performance.now();
    await page.screenshot({ type: "jpeg", quality: 90 });
    const e = performance.now();
    console.log(`T=${T} seek ${(b - a).toFixed(0)}ms (inner js+layout ${inner.toFixed(0)}ms) png ${(d - c).toFixed(0)}ms jpeg ${(e - d).toFixed(0)}ms`);
  }
  await browser.close();
} else if (mode === "cues") {
  const { browser, page } = await openPage(port);
  const data = await page.evaluate(() => ({ cues: window.__cues, duration: window.__duration, scenes: window.__scenes }));
  await mkdir(join(root, "out"), { recursive: true });
  await writeFile(join(root, "out/cues.json"), JSON.stringify(data, null, 1));
  console.log(`${data.cues.length} cues, duration ${data.duration}`);
  await browser.close();
} else if (mode === "lobster") {
  await mkdir(join(root, "out/recap/frames"), { recursive: true });
  const { browser, page } = await openPage(port);
  if (process.env.PATCH) await page.evaluate((p) => (window.__logoPatch = p), JSON.parse(process.env.PATCH));
  const [name, lt] = args[1].split("@");
  await page.evaluate((x) => window.__seek(x), await page.evaluate(([n, x]) => window.__at(n, x), [name, Number(lt)]));
  const url = await page.evaluate(() => document.getElementById("gl").toDataURL("image/png"));
  const f = join(root, `out/recap/frames/${args[2] ?? "lobster"}.png`);
  await writeFile(f, Buffer.from(url.split(",")[1], "base64"));
  console.log(f);
  await browser.close();
} else if (mode === "recap") {
  const out = join(root, "out/recap");
  await mkdir(out, { recursive: true });
  // The page reads the blog post's screenshots through this link and the lobster from `lobster outro@3`.
  const blog = join(out, "blog");
  if (!existsSync(blog)) await symlink(resolve(root, "../../apps/docs/blog/2026/09-03-homarr-2.0/img"), blog);
  if (!existsSync(join(out, "frames/lobster-front.png"))) throw new Error('run: PATCH=\'{"x":0,"y":0,"scale":1.1,"dust":0,"sparks":-1}\' bun render.mjs lobster outro@3 lobster-front');
  for (const v of args.length > 1 ? args.slice(1) : ["1", "2", "3", "4"]) {
    const { browser, page } = await openPage(port, `recap/index.html?v=${v}`);
    const f = join(out, `homarr-v2-recap-${v}.png`);
    await page.screenshot({ path: f });
    console.log(f);
    await browser.close();
  }
} else if (mode === "video") {
  // Resumable: the timeline is cut into short chunks pulled from a shared queue. Finished chunks
  // are kept on disk and skipped on the next run, and a crashed browser is relaunched and retried.
  const fps = opt("fps", 60);
  const sub = opt("sub", 1); // temporal subsamples per output frame (motion blur)
  const chunk = opt("chunk", 120); // output frames per chunk
  const recycle = opt("recycle", 6); // chunks per browser before relaunching it
  const { browser: b0, page: p0 } = await openPage(port);
  const duration = await p0.evaluate(() => window.__duration);
  await b0.close();
  const from = opt("from", 0);
  const to = opt("to", duration);
  const workers = opt("workers", 3);
  const total = Math.round((to - from) * fps);
  const dir = join(root, "out/seg");
  await mkdir(dir, { recursive: true });
  const chunks = [];
  for (let a = 0; a < total; a += chunk) {
    const g = Math.round(from * fps) + a; // global first frame, so chunks line up across runs
    chunks.push({ a, b: Math.min(total, a + chunk), out: join(dir, `f${String(g).padStart(6, "0")}.mkv`) });
  }
  const todo = chunks.filter((c) => !existsSync(c.out));
  const t0 = Date.now();
  let done = 0;
  const need = todo.reduce((n, c) => n + c.b - c.a, 0);
  console.log(`${chunks.length - todo.length}/${chunks.length} chunks already rendered, ${need} frames to go`);

  const encode = (c) =>
    new Promise((ok, fail) => {
      const part = `${c.out}.part.mkv`;
      const ff = spawn(
        "ffmpeg",
        [
          "-y", "-loglevel", "error",
          "-f", "image2pipe", "-framerate", String(fps * sub), "-c:v", "png", "-i", "-",
          ...(sub > 1 ? ["-vf", `tmix=frames=${sub}:weights=${Array(sub).fill(1).join(" ")},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/${fps}/TB`, "-r", String(fps)] : []),
          "-c:v", "libx264", "-preset", "fast", "-crf", "8", "-pix_fmt", "yuv444p", "-threads", "2",
          part,
        ],
        { stdio: ["pipe", "inherit", "inherit"] },
      );
      ff.on("error", fail);
      ok({ ff, part });
    });

  async function renderChunk(page, cdp, c) {
    const { ff, part } = await encode(c);
    const closed = new Promise((r) => ff.on("close", r));
    let n = 0;
    try {
      for (let f = c.a; f < c.b; f++) {
        if ((f - c.a) % 15 === 0) await waitForHeadroom();
        for (let s = 0; s < sub; s++) {
          // Centered subframes spanning ~a 180° shutter.
          const t = from + (f + (sub > 1 ? (s / sub - 0.5) * 0.5 : 0)) / fps;
          await page.evaluate((x) => window.__seek(x), Math.max(0, t));
          const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
          if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
        }
        done++;
        n++;
        if (done % 30 === 0) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r${done}/${need} frames  ${(done / el).toFixed(1)} fps  eta ${((need - done) / (done / el)).toFixed(0)}s   `);
        }
      }
    } catch (e) {
      ff.stdin.destroy();
      ff.kill("SIGKILL");
      await closed;
      done -= n;
      throw e;
    }
    ff.stdin.end();
    const code = await closed;
    if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${c.out}`);
    await rename(part, c.out);
  }

  const queue = [...todo];
  const failures = new Map();
  const jobs = Array.from({ length: Math.min(workers, queue.length) }, async () => {
    let br = null;
    let used = 0;
    let page, cdp;
    while (queue.length) {
      const c = queue.shift();
      if (!br || used >= recycle) {
        await br?.close().catch(() => {});
        ({ browser: br, page } = await openPage(port));
        cdp = await page.context().newCDPSession(page);
        used = 0;
      }
      try {
        await renderChunk(page, cdp, c);
        used++;
      } catch (e) {
        const n = (failures.get(c.out) ?? 0) + 1;
        failures.set(c.out, n);
        console.error(`\nchunk ${c.out} failed (${n}): ${e.message.split("\n")[0]}`);
        await br?.close().catch(() => {});
        br = null;
        if (n < 4) queue.push(c);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    await br?.close().catch(() => {});
  });
  await Promise.all(jobs);
  const missing = chunks.filter((c) => !existsSync(c.out));
  await writeFile(join(dir, "list.txt"), chunks.map((c) => `file '${c.out}'`).join("\n"));
  console.log(`\nrendered ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${missing.length} chunks missing`);
  if (missing.length) process.exitCode = 1;
}
server.close();
