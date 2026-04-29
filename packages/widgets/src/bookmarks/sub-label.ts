import { removeTrailingSlash } from "@homarr/common";

// Path-only hrefs render as the path itself; absolute hrefs render the host.
export const getHrefSubLabel = (href: string | null | undefined): string | undefined => {
  if (!href) return undefined;
  if (href.startsWith("/")) return removeTrailingSlash(href);
  return new URL(href).hostname;
};
