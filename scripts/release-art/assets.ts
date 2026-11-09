import type { Page } from "playwright-core";
import { monogramLetter } from "./copy";
import type { Rect } from "./layout";
import { warn } from "./runtime";
import { C } from "./theme";
import type { RenderItem } from "./types";

export interface Quality {
  iconPx: number;
  svgKeepBytes: number;
  shotScale: number;
  shotQuality: number;
}

export const QUALITY_STEPS: Quality[] = [
  { iconPx: 96, svgKeepBytes: 6000, shotScale: 2, shotQuality: 0.82 },
  { iconPx: 72, svgKeepBytes: 2500, shotScale: 1.5, shotQuality: 0.7 },
  { iconPx: 56, svgKeepBytes: 0, shotScale: 1, shotQuality: 0.6 },
];

export type IconModel =
  | { type: "image"; uri: string; plate: boolean }
  | { type: "monogram"; letter: string }
  | { type: "glyph" };

const DARK_PLATE_BELOW = 0.36;
const SHOT_MAX_WIDTH = 1600;
const FETCH_TIMEOUT_MS = 20_000;

interface Download {
  bytes: Buffer;
  type: string;
}

const downloads = new Map<string, Promise<Download | null>>();

const load = async (url: string): Promise<Download> => {
  if (!/^https?:\/\//.test(url)) throw new Error("unsupported URL scheme");
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "" };
};

const settled = (url: string, label: string) => {
  const cached = downloads.get(url);
  if (cached) return cached;
  const task = load(url).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    warn(`release-art: ${label} ${url} unavailable (${reason})`);
    return null;
  });
  downloads.set(url, task);
  return task;
};

const sniffMime = (file: Download, url: string) => {
  if (file.type.startsWith("image/")) return file.type.split(";")[0] ?? "image/png";
  if (/\.svg(\?|$)/.test(url)) return "image/svg+xml";
  if (/\.jpe?g(\?|$)/.test(url)) return "image/jpeg";
  if (/\.webp(\?|$)/.test(url)) return "image/webp";
  return "image/png";
};

const dataUri = (mime: string, bytes: Buffer | string) => {
  const buffer = Buffer.from(bytes);
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

const rasterize = async (page: Page, mime: string, bytes: Buffer, px: number) => {
  const isSvg = mime === "image/svg+xml";
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{width:${px}px;height:${px}px;object-fit:contain;display:block}</style><img id="i" src="${dataUri(mime, bytes)}">`,
  );
  await page.waitForFunction(
    (svg) => {
      const el = document.getElementById("i");
      return el instanceof HTMLImageElement && el.complete && (svg || el.naturalWidth > 0);
    },
    isSvg,
    { timeout: 10_000 },
  );
  const png = await page.locator("#i").screenshot({ omitBackground: true, type: "png" });
  return dataUri("image/png", png);
};

const luminance = (page: Page, uri: string) =>
  page.evaluate(async (source) => {
    const img = new Image();
    img.src = source;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0.5;
    ctx.drawImage(img, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = (data[i + 3] ?? 0) / 255;
      sum += alpha * (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0));
      weight += alpha;
    }
    return weight ? sum / weight / 255 : 0.5;
  }, uri);

const isTabler = (url: string) => url.includes("/@tabler/icons");

const tablerIcon = (file: Download): IconModel => {
  const svg = file.bytes
    .toString("utf8")
    .replace(/currentColor/g, C.red)
    .replace(/stroke-width="2"/, 'stroke-width="1.75"');
  return { type: "image", uri: dataUri("image/svg+xml", svg), plate: false };
};

const rasterIcon = async (page: Page, file: Download, url: string, q: Quality): Promise<IconModel> => {
  const mime = sniffMime(file, url);
  const raster = await rasterize(page, mime, file.bytes, q.iconPx);
  const plate = (await luminance(page, raster)) < DARK_PLATE_BELOW;
  if (mime === "image/svg+xml" && file.bytes.length <= q.svgKeepBytes) {
    return { type: "image", uri: dataUri(mime, file.bytes), plate };
  }
  return { type: "image", uri: raster, plate };
};

const fallbackIcon = (item: RenderItem): IconModel => {
  if (item.kind === "widget") return { type: "glyph" };
  return { type: "monogram", letter: monogramLetter(item.name) };
};

export const prepareIcon = async (page: Page, item: RenderItem, q: Quality): Promise<IconModel> => {
  if (!item.iconUrl) return fallbackIcon(item);
  const file = await settled(item.iconUrl, `icon for ${item.name}`);
  if (!file) return fallbackIcon(item);
  try {
    if (isTabler(item.iconUrl)) return tablerIcon(file);
    return await rasterIcon(page, file, item.iconUrl, q);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warn(`release-art: icon for ${item.name} could not be decoded (${reason})`);
    return fallbackIcon(item);
  }
};

export const prepareShot = async (page: Page, item: RenderItem, rect: Rect, q: Quality): Promise<string | null> => {
  if (!item.screenshotUrl) return null;
  const file = await settled(item.screenshotUrl, `screenshot for ${item.name}`);
  if (!file) return null;
  const scale = Math.min(q.shotScale, SHOT_MAX_WIDTH / rect.w);
  const size = { w: Math.round(rect.w * scale), h: Math.round(rect.h * scale) };
  try {
    return await page.evaluate(
      async (args) => {
        const img = new Image();
        img.src = args.uri;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = args.w;
        canvas.height = args.h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas unavailable");
        ctx.fillStyle = args.bg;
        ctx.fillRect(0, 0, args.w, args.h);
        const cover = Math.max(args.w / img.naturalWidth, args.h / img.naturalHeight);
        const dw = img.naturalWidth * cover;
        const dh = img.naturalHeight * cover;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (args.w - dw) / 2, (args.h - dh) / 2, dw, dh);
        return canvas.toDataURL("image/jpeg", args.quality);
      },
      { uri: dataUri(sniffMime(file, item.screenshotUrl), file.bytes), ...size, quality: q.shotQuality, bg: C.panel },
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warn(`release-art: screenshot for ${item.name} could not be decoded (${reason})`);
    return null;
  }
};

export const prefetch = async (items: RenderItem[]) => {
  const jobs = items.flatMap((item) => {
    const pending: Array<Promise<Download | null>> = [];
    if (item.iconUrl) pending.push(settled(item.iconUrl, `icon for ${item.name}`));
    if (item.screenshotUrl) pending.push(settled(item.screenshotUrl, `screenshot for ${item.name}`));
    return pending;
  });
  await Promise.all(jobs);
  const usable = new Set<string>();
  for (const [url, task] of downloads) {
    if (await task) usable.add(url);
  }
  return usable;
};
