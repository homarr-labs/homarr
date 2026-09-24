import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { createSearchAPI } from "fumadocs-core/search/server";
import { structure } from "fumadocs-core/mdx-plugins/remark-structure";

import { apiSource } from "@/lib/openapi";
import { getApiMarkdown } from "@/lib/openapi-markdown";
import { getPageMarkdown, source } from "@/lib/source";

export const revalidate = false;

async function buildDocIndex(page: (typeof source)["$inferPage"]) {
  const markdown = await getPageMarkdown(page);
  const original = page.data.structuredData;
  const headings = new Set(original.headings.map(({ id }) => id));
  const resolved = structure(markdown.replace(/^(#{1,6} .+) \[#[^\]]+\]$/gm, "$1"));
  const contents = new Map(original.contents.map((content) => [`${content.heading}\0${content.content}`, content]));
  for (const content of resolved.contents) {
    // Generated metadata can contain subheadings that are not HTML anchors.
    let heading: string | undefined;
    if (content.heading && headings.has(content.heading)) heading = content.heading;
    contents.set(`${heading}\0${content.content}`, { ...content, heading });
  }

  return {
    id: page.url,
    title: stringOrFallback(page.data.title, page.url),
    description: stringValue(page.data.description),
    url: page.url,
    breadcrumbs: getBreadcrumbItems(page.url, source.getPageTree(page.locale), { includeRoot: true })
      .map((item) => item.name)
      .filter((name): name is string => typeof name === "string"),
    structuredData: {
      headings: original.headings,
      contents: [...contents.values()],
    },
    locale: page.locale,
  };
}

async function buildApiIndex(page: (typeof apiSource)["$inferPage"]) {
  const markdown = getApiMarkdown(page);
  return {
    id: page.url,
    title: stringOrFallback(page.data.title, page.url),
    description: stringValue(page.data.description),
    url: page.url,
    breadcrumbs: ["API reference"],
    structuredData: {
      headings: [],
      contents: [{ content: markdown, heading: undefined }],
    },
    locale: page.locale,
  };
}

export const searchAPI = createSearchAPI("advanced", {
  language: "english",
  indexes: async () => [
    ...(await Promise.all(source.getPages().map(buildDocIndex))),
    ...(await Promise.all(apiSource.getPages().map(buildApiIndex))),
  ],
});

export const GET = searchAPI.staticGET;

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  return undefined;
}

function stringOrFallback(value: unknown, fallback: string) {
  return stringValue(value) ?? fallback;
}
