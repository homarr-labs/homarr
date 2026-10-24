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

export const SAFE_NEW_TAB_REL = "noopener noreferrer";

interface SafeApplicationUrlOptions {
  baseUrl?: unknown;
}

/** Returns an absolute, credential-free HTTP(S) URL suitable for application navigation. */
export const getSafeApplicationUrl = (value: unknown, options: SafeApplicationUrlOptions = {}): string | undefined => {
  if (typeof value !== "string" || value.trim() === "") return undefined;

  try {
    let baseUrl: string | undefined;
    if (options.baseUrl !== undefined) {
      const parsedBase = parseHttpUrl(options.baseUrl);
      if (!parsedBase) return undefined;
      parsedBase.search = "";
      parsedBase.hash = "";
      baseUrl = parsedBase.toString();
    }

    return parseHttpUrl(value, baseUrl)?.toString();
  } catch {
    return undefined;
  }
};

const parseHttpUrl = (value: unknown, baseUrl?: string): URL | undefined => {
  if (typeof value !== "string") return undefined;
  const url = new URL(value, baseUrl);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") {
    return undefined;
  }
  return url;
};
