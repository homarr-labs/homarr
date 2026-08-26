import { getSafeApplicationUrl } from "../common/application-url";

const relativeUrlBase = "https://homarr.invalid";

export const getSafeIframeUrl = (value: unknown): string | undefined => {
  const absoluteUrl = getSafeApplicationUrl(value);
  if (absoluteUrl) return absoluteUrl;
  if (typeof value !== "string") return undefined;

  const path = value.trim();
  if (!path.startsWith("/")) return undefined;

  const resolvedUrl = getSafeApplicationUrl(path, { baseUrl: relativeUrlBase });
  if (!resolvedUrl) return undefined;

  const parsedUrl = new URL(resolvedUrl);
  if (parsedUrl.origin !== relativeUrlBase) return undefined;
  return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
};
