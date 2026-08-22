import { getSafeApplicationUrl } from "../common/application-url";

export const directBookmarkPrefix = "url:";

export interface BookmarkItem {
  id: string;
  name: string;
  description: string | null;
  iconUrl?: string;
  href: string | null;
}

export const normalizeBookmarkUrl = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) return undefined;

  const directUrl = getSafeApplicationUrl(trimmedValue);
  if (directUrl) return directUrl;

  if (/^(?:localhost(?::\d+)?|(?:[\w-]+\.)+[\w-]+(?::\d+)?)(?:[/?#].*)?$/i.test(trimmedValue)) {
    return getSafeApplicationUrl(`https://${trimmedValue}`);
  }

  return undefined;
};

export const getDirectBookmarkValue = (url: string) => `${directBookmarkPrefix}${url}`;

export const getDirectBookmarkUrl = (value: string): string | undefined => {
  if (!value.startsWith(directBookmarkPrefix)) return undefined;
  return normalizeBookmarkUrl(value.slice(directBookmarkPrefix.length));
};

export const getBookmarkFaviconUrl = (href: string | null): string | undefined => {
  const safeUrl = getSafeApplicationUrl(href);
  if (!safeUrl) return undefined;

  const url = new URL(safeUrl);
  return `${url.origin}/favicon.ico`;
};

export const createDirectBookmark = (url: string): BookmarkItem | undefined => {
  const href = normalizeBookmarkUrl(url);
  if (!href) return undefined;

  const parsedUrl = new URL(href);
  return {
    id: getDirectBookmarkValue(href),
    name: parsedUrl.hostname,
    description: null,
    href,
  };
};

export const splitBookmarkUrls = (value: string) =>
  value.split(/\r?\n+/).flatMap((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return [];

    const commaSeparatedValues = trimmedLine.split(",").map((part) => part.trim());
    if (commaSeparatedValues.length > 1 && commaSeparatedValues.every((part) => normalizeBookmarkUrl(part))) {
      return commaSeparatedValues;
    }

    return [trimmedLine];
  });
