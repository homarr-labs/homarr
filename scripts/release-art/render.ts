import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, Page } from "playwright-core";
import { prefetch, prepareIcon, prepareShot, QUALITY_STEPS } from "./assets";
import type { Quality } from "./assets";
import { buildSvg } from "./board";
import { launchBrowser } from "./browser";
import { tileText } from "./copy";
import { planLayout } from "./layout";
import type { Layout } from "./layout";
import { warn } from "./runtime";
import { H, W } from "./theme";
import type { TileContent } from "./tiles";
import type { RenderItem } from "./types";

const SVG_BUDGET_BYTES = 480_000;
const PNG_SETTLE_MS = 200;

interface RenderOptions {
  version: string;
  items: RenderItem[];
  outDir: string;
}

export interface RenderResult {
  svg: string;
  png: string;
}

const prepareContents = async (page: Page, layout: Layout, items: RenderItem[], quality: Quality) => {
  const contents: Array<TileContent | null> = [];
  for (const plan of layout.tiles) {
    const item = plan.item === null ? undefined : items[plan.item];
    if (!item) {
      contents.push(null);
      continue;
    }
    const icon = await prepareIcon(page, item, quality);
    const shot = await prepareShot(page, item, plan.rect, quality);
    contents.push({ item, text: tileText(item), icon, shot });
  }
  return contents;
};

const buildWithinBudget = async (browser: Browser, version: string, items: RenderItem[]) => {
  const layout = planLayout(items);
  const page = await browser.newPage();
  try {
    let svg = "";
    for (const quality of QUALITY_STEPS) {
      const contents = await prepareContents(page, layout, items, quality);
      svg = buildSvg({ version, items, layout, contents });
      if (Buffer.byteLength(svg) <= SVG_BUDGET_BYTES) return svg;
    }
    warn(`release-art: SVG is ${Math.round(Buffer.byteLength(svg) / 1024)} KB, over the budget at the lowest quality`);
    return svg;
  } finally {
    await page.close();
  }
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

const withUsableShots = (items: RenderItem[], usable: Set<string>) =>
  items.map((item): RenderItem => {
    const url = item.screenshotUrl;
    if (item.kind === "widget" && url && usable.has(url)) return item;
    return { ...item, screenshotUrl: undefined };
  });

export const render = async (options: RenderOptions): Promise<RenderResult> => {
  if (options.items.length === 0) throw new Error("no items to render");
  const browser = await launchBrowser();
  try {
    const usable = await prefetch(options.items);
    const items = withUsableShots(options.items, usable);
    const svg = await buildWithinBudget(browser, options.version, items);
    mkdirSync(options.outDir, { recursive: true });
    const svgPath = join(options.outDir, "whats-new.svg");
    const pngPath = join(options.outDir, "whats-new.png");
    writeFileSync(svgPath, svg);
    await screenshotSvg(browser, svgPath, pngPath);
    return { svg: svgPath, png: pngPath };
  } finally {
    await browser.close();
  }
};
