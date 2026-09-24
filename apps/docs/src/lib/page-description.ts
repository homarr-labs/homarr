import { structure } from "fumadocs-core/mdx-plugins/remark-structure";
import { cache } from "react";

import { getPageMarkdown, type source } from "./source";

/** Reuse the rendered content so directory and search-engine summaries stay aligned. */
export const getPageDescription = cache(async (page: (typeof source)["$inferPage"]) => {
  if (page.data.description) return page.data.description;

  const markdown = await getPageMarkdown(page);
  const paragraph = structure(markdown).contents.find(
    ({ content }) => content.trim().length > 40 && !content.startsWith("Categories:"),
  )?.content;
  if (!paragraph) return `Set up and use ${page.data.title} in Homarr.`;

  const text = paragraph.replace(/\s+/g, " ").trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).replace(/\s+\S*$/, "")}…`;
});
