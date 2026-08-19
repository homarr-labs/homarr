import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "faviconFetcher" });

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const requestTimeoutInMs = 5_000;
// Icon declarations live in the document head, so only the beginning of the page is read.
const maximumHtmlBytes = 256 * 1024;

// Link relations that declare a page icon, ordered from most to least preferred.
// The relation is the primary ranking signal because the sizes attribute is omitted
// far too often to compare candidates of different relations by their size.
const iconRelationScores: Record<string, number> = {
  "apple-touch-icon-precomposed": 4,
  "apple-touch-icon": 3,
  icon: 2,
  "shortcut icon": 1,
};

interface IconCandidate {
  url: string;
  relationScore: number;
  sizeArea: number;
}

/**
 * Resolves the icon of a website by reading the `<link rel="icon">` and
 * `<link rel="apple-touch-icon">` declarations of the page it serves and by
 * falling back to the well known `/favicon.ico` of its origin.
 *
 * Returns `null` when the site is unreachable or declares no usable icon.
 *
 * The request goes to an address the user provided, so this may only be called
 * from an authorized context. Addresses in the local network are allowed on
 * purpose because self hosted apps usually run next to Homarr.
 */
export const fetchFaviconUrlAsync = async (href: string): Promise<string | null> => {
  const websiteUrl = parseHttpUrl(href);
  if (websiteUrl === null) return null;

  const page = await fetchPageAsync(websiteUrl);
  const declaredIconUrl = page === null ? null : findDeclaredIconUrl(page.html, page.url);
  if (declaredIconUrl !== null) return declaredIconUrl;

  // The well known icon belongs to the origin that actually served the page, which is a
  // different one than the requested address whenever the app redirects across origins.
  const wellKnownUrl = new URL("/favicon.ico", page?.url.origin ?? websiteUrl.origin);
  return (await isImageAsync(wellKnownUrl)) ? wellKnownUrl.href : null;
};

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

const fetchPageAsync = async (websiteUrl: URL): Promise<{ html: string; url: URL } | null> => {
  let response: FetchResponse;
  try {
    response = await fetchWithTrustedCertificatesAsync(websiteUrl, {
      headers: { Accept: "text/html" },
      timeout: requestTimeoutInMs,
      // The timeout above ends once the headers are there, so the body needs its own
      // limit to keep a stalled page from holding the request open forever.
      bodyTimeout: requestTimeoutInMs,
    });
  } catch (error) {
    logger.debug("Unable to load website for favicon detection", { url: websiteUrl.href, error });
    return null;
  }

  const body = response.body;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!response.ok || !contentType.includes("text/html") || body === null) {
    await cancelBodyAsync(response);
    return null;
  }

  try {
    // Relative icons are resolved against the page that answered, which can differ from
    // the requested address when the app redirects, for example to a login page.
    return { html: await readDocumentHeadAsync(body), url: parseHttpUrl(response.url) ?? websiteUrl };
  } catch (error) {
    logger.debug("Unable to read website for favicon detection", { url: websiteUrl.href, error });
    return null;
  }
};

const readDocumentHeadAsync = async (body: NonNullable<FetchResponse["body"]>): Promise<string> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let readBytes = 0;

  try {
    while (readBytes < maximumHtmlBytes && !html.includes("</head>")) {
      const { done, value } = await reader.read();
      if (done) break;

      readBytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return html;
};

const linkTagRegex = /<link\b[^>]*>/gi;
const attributeRegex = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const sizeRegex = /(\d+)x(\d+)/gi;

const findDeclaredIconUrl = (html: string, pageUrl: URL): string | null => {
  const candidates: IconCandidate[] = [];

  for (const linkTag of html.match(linkTagRegex) ?? []) {
    const attributes = parseAttributes(linkTag);
    const relation = attributes.rel?.toLowerCase().replaceAll(/\s+/g, " ").trim();
    const relationScore = relation === undefined ? undefined : iconRelationScores[relation];
    if (relationScore === undefined || attributes.href === undefined) continue;

    const url = resolveHttpUrl(attributes.href, pageUrl);
    if (url === null) continue;

    candidates.push({ url, relationScore, sizeArea: parseLargestSizeArea(attributes.sizes) });
  }

  const bestCandidate = candidates.toSorted(
    (first, second) => second.relationScore - first.relationScore || second.sizeArea - first.sizeArea,
  )[0];

  return bestCandidate?.url ?? null;
};

const parseAttributes = (linkTag: string): Record<string, string> => {
  const attributes: Record<string, string> = {};

  for (const match of linkTag.matchAll(attributeRegex)) {
    const name = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5];
    if (name !== undefined && value !== undefined) {
      attributes[name] = value;
    }
  }

  return attributes;
};

// Parses a sizes attribute like "32x32" or "180x180 128x128" into the largest area it
// declares so that the icon with the highest resolution wins.
const parseLargestSizeArea = (sizes: string | undefined): number => {
  if (sizes === undefined) return 0;

  let largestArea = 0;
  for (const match of sizes.matchAll(sizeRegex)) {
    largestArea = Math.max(largestArea, Number(match[1] ?? 0) * Number(match[2] ?? 0));
  }

  return largestArea;
};

const resolveHttpUrl = (href: string, pageUrl: URL): string | null => {
  try {
    const url = new URL(href, pageUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const isImageAsync = async (url: URL): Promise<boolean> => {
  let response: FetchResponse;
  try {
    response = await fetchWithTrustedCertificatesAsync(url, { timeout: requestTimeoutInMs });
  } catch (error) {
    logger.debug("Unable to load the well known favicon", { url: url.href, error });
    return false;
  }

  await cancelBodyAsync(response);
  if (!response.ok) return false;

  // Many self hosted apps answer unknown paths with their HTML entry point, so only the
  // content type tells apart a real icon from such a fallback page.
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.startsWith("image/") || contentType.includes("icon");
};

const cancelBodyAsync = async (response: FetchResponse): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // The connection is already gone, so there is nothing left to release
  }
};
