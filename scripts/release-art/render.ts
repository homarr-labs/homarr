import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import type { Browser, LaunchOptions, Page } from "playwright-core";
import { prefetch, prepareIcon, prepareShot } from "./assets";
import { buildSvg } from "./board";
import type { RenderItem } from "./items";
import { tileText } from "./items";
import { planLayout } from "./layout";
import type { Layout } from "./layout";
import { H, W } from "./svg";
import type { TileContent } from "./tiles";

const SVG_BUDGET_BYTES = 500_000;
const PNG_SETTLE_MS = 200;
const INSTALL_TIMEOUT_MS = 300_000;

interface RenderOptions {
  version: string;
  items: RenderItem[];
  outDir: string;
}

const tryLaunch = async (options: LaunchOptions) => {
  try {
    return await chromium.launch(options);
  } catch (error) {
    console.error(`release-art: browser launch failed (${String(error).split("\n")[0]})`);
    return null;
  }
};

const installChromium = () => {
  const cli = join(dirname(createRequire(import.meta.url).resolve("playwright-core/package.json")), "cli.js");
  console.error("release-art: installing Playwright Chromium");
  execFileSync("node", [cli, "install", "chromium"], { stdio: ["ignore", 2, 2], timeout: INSTALL_TIMEOUT_MS });
};

const launchBrowser = async () => {
  const browser = (await tryLaunch({ channel: "chrome" })) ?? (await tryLaunch({}));
  if (browser) return browser;
  installChromium();
  return chromium.launch();
};

const prepareContents = async (page: Page, layout: Layout) => {
  const contents: Array<TileContent | null> = [];
  for (const { item, rect } of layout.tiles) {
    if (!item) {
      contents.push(null);
      continue;
    }
    const icon = await prepareIcon(page, item);
    const shot = await prepareShot(page, item, rect);
    contents.push({ item, text: tileText(item), icon, shot });
  }
  return contents;
};

const screenshotSvg = async (browser: Browser, svgPath: string, pngPath: string) => {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(svgPath).href);
    await page.waitForTimeout(PNG_SETTLE_MS);
    await page.screenshot({ path: pngPath, type: "png", omitBackground: true });
  } finally {
    await context.close();
  }
};

export const render = async ({ version, items, outDir }: RenderOptions) => {
  if (items.length === 0) throw new Error("no items to render");
  const browser = await launchBrowser();
  try {
    const ready = await prefetch(items);
    const layout = planLayout(ready);
    const contents = await prepareContents(await browser.newPage(), layout);
    const svg = buildSvg({ version, items: ready, layout, contents });
    const bytes = Buffer.byteLength(svg);
    if (bytes > SVG_BUDGET_BYTES) {
      console.error(`release-art: SVG is ${Math.round(bytes / 1024)} KB, over the ${SVG_BUDGET_BYTES} byte budget`);
    }
    mkdirSync(outDir, { recursive: true });
    const svgPath = join(outDir, "whats-new.svg");
    const pngPath = join(outDir, "whats-new.png");
    writeFileSync(svgPath, svg);
    await screenshotSvg(browser, svgPath, pngPath);
    return { svg: svgPath, png: pngPath };
  } finally {
    await browser.close();
  }
};
