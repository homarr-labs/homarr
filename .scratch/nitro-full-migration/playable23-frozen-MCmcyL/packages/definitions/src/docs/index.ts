import type { HomarrDocumentationPath } from "./homarr-docs-sitemap";

const defaultDocumentationBaseUrl = "https://homarr.dev";

const getDocumentationBaseUrl = () => {
  const browserValue =
    typeof document === "undefined"
      ? undefined
      : document.querySelector<HTMLMetaElement>('meta[name="homarr-website-url"]')?.content;
  const serverValue = typeof process === "undefined" ? undefined : process.env.HOMARR_WEBSITE_URL;
  return (browserValue || serverValue || defaultDocumentationBaseUrl).replace(/\/+$/u, "");
};

// Please use the method so the path can be checked!
export const createDocumentationLink = (
  path: HomarrDocumentationPath,
  hashTag?: `#${string}`,
  queryParams?: Record<string, string>,
) => {
  const url = `${getDocumentationBaseUrl()}${path}`;
  const params = queryParams ? `?${new URLSearchParams(queryParams)}` : "";
  return `${url}${params}${hashTag ?? ""}`;
};
