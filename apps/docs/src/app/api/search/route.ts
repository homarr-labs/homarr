import { createFromSource } from "fumadocs-core/search/server";
import { structure } from "fumadocs-core/mdx-plugins/remark-structure";

import { getPageMarkdown, source } from "@/lib/source";

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
  async buildIndex(page) {
    const markdown = await getPageMarkdown(page);
    const original = page.data.structuredData;
    const headings = new Set(original.headings.map(({ id }) => id));
    const resolved = structure(markdown.replace(/^(#{1,6} .+) \[#[^\]]+\]$/gm, "$1"));
    const contents = new Map(original.contents.map((content) => [`${content.heading}\0${content.content}`, content]));
    for (const content of resolved.contents) {
      // Generated metadata can contain subheadings that are not HTML anchors.
      const heading = content.heading && headings.has(content.heading) ? content.heading : undefined;
      contents.set(`${heading}\0${content.content}`, { ...content, heading });
    }

    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData: {
        headings: original.headings,
        contents: [...contents.values()],
      },
    };
  },
});
