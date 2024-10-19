import type { HomarrDocumentationPath } from "./homarr-docs-sitemap";

const documentationBaseUrl = "https://deploy-preview-113--homarr-docs.netlify.app";

// Please use the method so the path can be checked!
export const createDocumentationLink = (path: HomarrDocumentationPath, hashTag?: `#${string}`) =>
  `${documentationBaseUrl}${path}${hashTag ?? ""}`;
