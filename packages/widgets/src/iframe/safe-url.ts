import { getSafeAppHref, getSafeApplicationUrl } from "@homarr/common";

export const getSafeIframeUrl = (url: unknown) => {
  const applicationUrl = getSafeApplicationUrl(url);
  if (applicationUrl) return applicationUrl;

  const relativeUrl = getSafeAppHref(url);
  if (relativeUrl?.startsWith("/") && !relativeUrl.startsWith("//")) return relativeUrl;
  return undefined;
};
