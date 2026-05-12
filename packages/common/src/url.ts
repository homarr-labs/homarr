import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export const removeTrailingSlash = (path: string) => {
  let end = path.length;
  while (end > 0 && path.charAt(end - 1) === "/") {
    end--;
  }
  return path.slice(0, end);
};

export const extractBaseUrlFromHeaders = (
  headers: ReadonlyHeaders,
  fallbackProtocol: "http" | "https" = "http",
): `${string}://${string}` => {
  // For empty string we also use the fallback protocol
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  let protocol = headers.get("x-forwarded-proto") || fallbackProtocol;

  // @see https://support.glitch.com/t/x-forwarded-proto-contains-multiple-protocols/17219
  if (protocol.includes(",")) {
    protocol = protocol.includes("https") ? "https" : "http";
  }

  const host = headers.get("x-forwarded-host") ?? headers.get("host");

  return `${protocol}://${host}`;
};

export const getPortFromUrl = (url: URL): number => {
  const port = url.port;
  if (port) {
    return Number(port);
  }

  if (url.protocol === "https:") {
    return 443;
  }

  if (url.protocol === "http:") {
    return 80;
  }

  throw new Error(`Unsupported protocol: ${url.protocol}`);
};

const absoluteUrlRegex = /^[a-z]+:(\/\/)?/;

export const isAbsoluteUrl = (urlOrPath: string): boolean => {
  return absoluteUrlRegex.test(urlOrPath.toLowerCase());
};

/**
 * Resolves an app to the absolute URL the server should use, or null.
 *   1. explicit `pingUrl`       -> as-is
 *   2. absolute `href`          -> as-is
 *   3. non-absolute `href`      -> null  (path-only `/cockpit/`, schemeless `foo/bar`)
 *   4. null/empty `href`        -> null  (short-circuits before the absoluteness check)
 *
 * Non-absolute hrefs are intentionally null server-side: synthesizing them
 * from request headers would be a header-spoofing vector, and the browser
 * already resolves them against the current origin natively. Apps that need
 * server-side ping coverage should carry an explicit `pingUrl`.
 */
export const resolveServerUrl = (app: { href: string | null; pingUrl: string | null }): string | null => {
  if (app.pingUrl) {
    return app.pingUrl;
  }

  if (app.href && isAbsoluteUrl(app.href)) {
    return app.href;
  }

  return null;
};
