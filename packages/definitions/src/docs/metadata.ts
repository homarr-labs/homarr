import { XMLParser } from "fast-xml-parser";
import { z } from "zod/v4";

import { widgetDocSlugs } from "./widget-doc-slugs";
import { getIntegrationDocumentationSlug, integrationKinds } from "../integration";

const documentationOrigin = "https://homarr.dev";
export const documentationSitemapUrl = `${documentationOrigin}/sitemap.xml`;

const normalizePaths = (paths: readonly string[]) => {
  const normalized = paths.map((path) => {
    const url = new URL(path, documentationOrigin);
    if (url.origin !== documentationOrigin || url.search || url.hash) {
      throw new Error(`Invalid documentation path: ${path}`);
    }
    return url.pathname.replace(/\/+$/u, "");
  });
  return [...new Set(normalized)].toSorted();
};

export const parseDocumentationSitemap = (xml: string) => {
  const data: unknown = new XMLParser({ isArray: (name) => name === "url" }).parse(xml);
  const sitemap = z
    .object({ urlset: z.object({ url: z.array(z.object({ loc: z.string().url() })).min(1) }) })
    .parse(data);
  return normalizePaths(sitemap.urlset.url.map((url) => url.loc));
};

// Both remote refresh and offline generation share normalization and slug reconciliation.
export const createDocumentationMetadata = (sitemapPaths: readonly string[]) => {
  const snapshotPaths = normalizePaths(sitemapPaths);
  const paths = normalizePaths([
    ...snapshotPaths,
    "/sitemap.xml",
    "/blog",
    "/search",
    ...integrationKinds
      .map(getIntegrationDocumentationSlug)
      .filter((slug) => slug !== null)
      .map((slug) => `/docs/integrations/${slug}`),
    ...Object.values(widgetDocSlugs)
      .filter((slug) => slug !== null)
      .map((slug) => `/docs/widgets/${slug}`),
  ]);

  return {
    snapshot: `${JSON.stringify(snapshotPaths, null, 2)}\n`,
    source:
      "// Generated from sitemap-paths.json and local documentation slugs.\n" +
      "// Update offline with docs:generate; refresh the pinned sitemap with docs:refresh.\n" +
      "export type HomarrDocumentationPath =\n" +
      paths.map((path) => `  | ${JSON.stringify(path)}`).join("\n") +
      ";\n",
  };
};
