import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "favicon-fetcher" });

const requestTimeoutMilliseconds = 5000;
const maximumHtmlBytes = 512 * 1024;

// Relations that point at a page icon, ordered from most to least preferred.
// The relation is deliberately the primary ranking signal: apple touch icons are
// designed as app tile artwork, and the sizes attribute is omitted far too often
// (parseSizeArea then yields 0) to compare candidates across relation types by
// size. The declared size only breaks ties within the same relation.
const iconRelationScores: Record<string, number> = {
  "apple-touch-icon-precomposed": 4,
  "apple-touch-icon": 3,
  icon: 2,
  "shortcut icon": 1,
};

interface IconCandidate {
  absoluteUrl: string;
  relationScore: number;
  sizeArea: number;
}

/**
 * Resolves the best icon URL for an app by inspecting the page the app links to.
 * It looks for `<link rel="icon">` / `<link rel="apple-touch-icon">` declarations
 * and falls back to the well-known `/favicon.ico` at the site origin. Returns
 * `null` when nothing usable is found.
 *
 * This performs an outbound request to a user-supplied URL, so it must only be
 * called from an authenticated context. The scheme is restricted to http(s) and
 * the response is bounded in size and time. Private/LAN targets are intentionally
 * NOT blocked: Homarr apps commonly live on the local network.
 */
export const fetchBestIconUrlForAppAsync = async (appHref: string): Promise<string | null> => {
  const pageUrl = parseHttpUrl(appHref);
  if (!pageUrl) {
    return null;
  }

  const page = await fetchHtmlPageAsync(pageUrl);
  if (page) {
    const declaredIconUrl = extractBestIconUrl(page.html, page.finalUrl);
    if (declaredIconUrl) {
      return declaredIconUrl;
    }
  }

  const fallbackUrl = new URL("/favicon.ico", pageUrl.origin);
  return (await isReachableImageAsync(fallbackUrl)) ? fallbackUrl.href : null;
};

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

const fetchHtmlPageAsync = async (pageUrl: URL): Promise<{ html: string; finalUrl: URL } | null> => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), requestTimeoutMilliseconds);

  try {
    const response = await fetch(pageUrl, {
      redirect: "follow",
      signal: abortController.signal,
      headers: { Accept: "text/html" },
    });

    if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) {
      return null;
    }

    const html = await readBoundedTextAsync(response.body, maximumHtmlBytes);
    return { html, finalUrl: new URL(response.url) };
  } catch (error) {
    logger.debug("Could not fetch page for favicon detection", { pageUrl: pageUrl.href, error });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Reads at most maximumBytes from the stream so a huge or slow page cannot
// exhaust memory. The favicon declarations always live in the <head>, so the
// first chunk of HTML is enough.
const readBoundedTextAsync = async (body: ReadableStream<Uint8Array>, maximumBytes: number): Promise<string> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let readBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      readBytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (readBytes >= maximumBytes) {
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return text;
};

const linkTagRegex = /<link\b[^>]*>/gi;
const attributeRegex = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

const extractBestIconUrl = (html: string, baseUrl: URL): string | null => {
  const candidates: IconCandidate[] = [];

  for (const linkTag of html.match(linkTagRegex) ?? []) {
    const attributes = parseAttributes(linkTag);
    const relation = attributes.rel?.toLowerCase().trim();
    const relationScore = relation ? iconRelationScores[relation] : undefined;
    if (relationScore === undefined || !attributes.href) {
      continue;
    }

    const absoluteUrl = resolveAbsoluteUrl(attributes.href, baseUrl);
    if (!absoluteUrl) {
      continue;
    }

    candidates.push({ absoluteUrl, relationScore, sizeArea: parseSizeArea(attributes.sizes) });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((first, second) =>
    first.relationScore !== second.relationScore
      ? second.relationScore - first.relationScore
      : second.sizeArea - first.sizeArea,
  );

  return candidates[0]?.absoluteUrl ?? null;
};

const parseAttributes = (tag: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(attributeRegex)) {
    const name = match[1]?.toLowerCase();
    const rawValue = match[3] ?? match[4] ?? match[5];
    if (name && rawValue !== undefined) {
      attributes[name] = rawValue;
    }
  }
  return attributes;
};

// Parses a sizes attribute like "32x32" or "180x180 128x128" into the largest
// pixel area it declares, so higher resolution icons are preferred.
const parseSizeArea = (sizes: string | undefined): number => {
  if (!sizes) {
    return 0;
  }

  let largestArea = 0;
  for (const match of sizes.matchAll(/(\d+)x(\d+)/gi)) {
    const area = Number(match[1]) * Number(match[2]);
    if (area > largestArea) {
      largestArea = area;
    }
  }
  return largestArea;
};

const resolveAbsoluteUrl = (href: string, baseUrl: URL): string | null => {
  try {
    const resolved = new URL(href, baseUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.href : null;
  } catch {
    return null;
  }
};

const isReachableImageAsync = async (url: URL): Promise<boolean> => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), requestTimeoutMilliseconds);

  try {
    const response = await fetch(url, { redirect: "follow", signal: abortController.signal });
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return contentType.startsWith("image/") || contentType.includes("icon") || url.pathname.endsWith(".ico");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};
