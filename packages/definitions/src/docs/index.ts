import type { HomarrDocumentationPath } from "./homarr-docs-sitemap";

const documentationBaseUrl = "https://homarr.dev";

// Please use the method so the path can be checked!
export const createDocumentationLink = (path: HomarrDocumentationPath, hashTag?: `#${string}`) =>
  `${documentationBaseUrl}${path}${hashTag ?? ""}`;
