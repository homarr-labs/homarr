import { llms } from "fumadocs-core/source";

import { getPageMarkdownUrl, getPostMarkdownUrl, getPostUrl, posts, source } from "@/lib/source";

export const revalidate = false;

export function GET() {
  const blog = posts.entries.map(
    (post) => `- [${post.title}](${getPostUrl(post)}): [Markdown](${getPostMarkdownUrl(post)})`,
  );
  const index = llms(source, {
    renderDescription(node, { lang }) {
      if (node.type === "page") {
        const page = source.getNodePage(node, lang);
        if (page)
          return [page.data.description, `[Markdown](${getPageMarkdownUrl(page).url})`].filter(Boolean).join(" ");
      }
      return typeof node.description === "string" ? node.description : "";
    },
  }).index();
  const content = `${index}\n\n## Blog\n\n${blog.join("\n")}\n`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
