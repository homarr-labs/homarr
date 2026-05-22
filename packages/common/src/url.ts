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
 * Resolves the URL used for server-side operations like pinging.
 * href might be path-only (e.g. "/cockpit/") which is not resolvable server-side
 * @param app - object containing href and pingUrl properties
 * @returns the resolved URL as a string, or null if it cannot be resolved server-side
 */
export const resolveServerUrl = (app: { href: string | null; pingUrl: string | null }): string | null => {
  if (app.pingUrl) return app.pingUrl;
  if (!app.href) return null;
  if (isPath(app.href)) return null;
  return app.href;
};

/**
 * Builds a full URL by combining a base URL, a path, and optional query parameters.
 * @param baseUrl the base URL to use, it can contain a path, query parameters and hash
 * @param path the path to append to the base URL, it must start with a single slash and can contain query parameters
 * @param queryParams optional query parameters, will be merged with query parameters from base URL and path
 * @returns the constructed URL object
 */
export const buildUrl = (baseUrl: URL, path: Path, queryParams?: QueryParams) => {
  // constructs full url without query params or hash
  const url = new URL(`${baseUrl.origin}${removeTrailingSlash(baseUrl.pathname)}${path}`);

  baseUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value === null || value === undefined) {
        continue;
      }
      url.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
    }
  }

  return url;
};

/**
 * Checks if the input is a path, which is defined as a string that starts with a single slash.
 * @param input the value to check
 * @returns true if the input is a path, false otherwise
 */
export const isPath = (input: unknown): input is Path => {
  return typeof input === "string" && input.startsWith("/") && !input.startsWith("//");
};

/**
 * Parses an external URL from a string.
 * If the input is a path (starts with a single slash), it returns the path as is.
 * If the input is a full URL, it returns a URL object.
 * If the input is undefined or null, it returns null.
 * @param input the string to parse
 * @returns the parsed URL object, path string, or null
 */
export const parseExternalUrl = (input: string | undefined | null) => {
  if (!input) return null;

  if (isPath(input)) {
    return input;
  }

  return URL.parse(input);
};

/**
 * Type representing query parameters record
 */
export type QueryParams = Record<string, string | Date | number | boolean | null | undefined>;

/**
 * Type representing a path of a URL
 */
export type Path = `/${string}`;
