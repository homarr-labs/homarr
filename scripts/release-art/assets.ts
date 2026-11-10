import type { Page } from "playwright-core";
import type { RenderItem } from "./items";
import type { Rect } from "./layout";
import { COLOR } from "./svg";

export type IconModel =
  | { type: "image"; uri: string; plate: boolean }
  | { type: "monogram"; letter: string }
  | { type: "glyph" };

interface Download {
  bytes: Buffer;
  type: string;
}

const ICON_PX = 96;
const KEEP_SVG_BYTES = 6000;
const SHOT_SCALE = 2;
const SHOT_QUALITY = 0.82;
const SHOT_MAX_WIDTH = 1600;
const DARK_PLATE_BELOW = 0.36;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME = /^image\/[\w.+-]+$/;

const downloads = new Map<string, Promise<Download | null>>();

const readCapped = async (res: Response) => {
  if (Number(res.headers.get("content-length")) > MAX_DOWNLOAD_BYTES) throw new Error("response too large");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.length;
    if (size > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("response too large");
    }
    chunks.push(value);
  }
};

const fetchImage = async (url: string): Promise<Download> => {
  if (!/^https?:\/\//.test(url)) throw new Error("unsupported URL scheme");
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { bytes: await readCapped(res), type: res.headers.get("content-type") ?? "" };
};

const download = (url: string, label: string) => {
  const cached = downloads.get(url);
  if (cached) return cached;
  const task = fetchImage(url).catch((error: unknown) => {
    console.error(`release-art: ${label} ${url} unavailable (${error})`);
    return null;
  });
  downloads.set(url, task);
  return task;
};

const mimeFor = (file: Download, url: string) => {
  const declared = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (IMAGE_MIME.test(declared)) return declared;
  if (/\.svg(\?|$)/.test(url)) return "image/svg+xml";
  if (/\.jpe?g(\?|$)/.test(url)) return "image/jpeg";
  if (/\.webp(\?|$)/.test(url)) return "image/webp";
  return "image/png";
};

const dataUri = (mime: string, bytes: Buffer | string) =>
  `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

const rasterize = async (page: Page, mime: string, bytes: Buffer) => {
  await page.setViewportSize({ width: ICON_PX, height: ICON_PX });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{width:${ICON_PX}px;height:${ICON_PX}px;object-fit:contain;display:block}</style><img id="i" src="${dataUri(mime, bytes)}">`,
  );
  await page.waitForFunction(
    (svg) => {
      const el = document.getElementById("i");
      return el instanceof HTMLImageElement && el.complete && (svg || el.naturalWidth > 0);
    },
    mime === "image/svg+xml",
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
    if (!weight) return 0.5;
    return sum / weight / 255;
  }, uri);

const tablerIcon = (file: Download): IconModel => {
  const svg = file.bytes
    .toString("utf8")
    .replace(/currentColor/g, COLOR.red)
    .replace(/stroke-width="2"/, 'stroke-width="1.75"');
  return { type: "image", uri: dataUri("image/svg+xml", svg), plate: false };
};

const rasterIcon = async (page: Page, file: Download, url: string): Promise<IconModel> => {
  const mime = mimeFor(file, url);
  const raster = await rasterize(page, mime, file.bytes);
  const plate = (await luminance(page, raster)) < DARK_PLATE_BELOW;
  if (mime === "image/svg+xml" && file.bytes.length <= KEEP_SVG_BYTES) {
    return { type: "image", uri: dataUri(mime, file.bytes), plate };
  }
  return { type: "image", uri: raster, plate };
};

const fallbackIcon = (item: RenderItem): IconModel => {
  if (item.kind === "widget") return { type: "glyph" };
  return { type: "monogram", letter: /[\p{L}\p{N}]/u.exec(item.name)?.[0]?.toUpperCase() ?? "?" };
};

export const prepareIcon = async (page: Page, item: RenderItem): Promise<IconModel> => {
  if (!item.iconUrl) return fallbackIcon(item);
  const file = await download(item.iconUrl, `icon for ${item.name}`);
  if (!file) return fallbackIcon(item);
  try {
    if (item.iconUrl.includes("/@tabler/icons")) return tablerIcon(file);
    return await rasterIcon(page, file, item.iconUrl);
  } catch (error) {
    console.error(`release-art: icon for ${item.name} could not be decoded (${error})`);
    return fallbackIcon(item);
  }
};

export const prepareShot = async (page: Page, item: RenderItem, rect: Rect): Promise<string | null> => {
  if (!item.screenshotUrl) return null;
  const file = await download(item.screenshotUrl, `screenshot for ${item.name}`);
  if (!file) return null;
  const scale = Math.min(SHOT_SCALE, SHOT_MAX_WIDTH / rect.w);
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
      {
        uri: dataUri(mimeFor(file, item.screenshotUrl), file.bytes),
        ...size,
        quality: SHOT_QUALITY,
        bg: COLOR.panel,
      },
    );
  } catch (error) {
    console.error(`release-art: screenshot for ${item.name} could not be decoded (${error})`);
    return null;
  }
};

export const prefetch = (items: RenderItem[]) =>
  Promise.all(
    items.map(async (item): Promise<RenderItem> => {
      const { iconUrl, screenshotUrl } = item;
      const [, shot] = await Promise.all([
        iconUrl && download(iconUrl, `icon for ${item.name}`),
        screenshotUrl && download(screenshotUrl, `screenshot for ${item.name}`),
      ]);
      if (item.kind === "widget" && shot) return item;
      return { ...item, screenshotUrl: undefined };
    }),
  );
