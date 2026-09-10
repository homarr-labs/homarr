import { llms } from "fumadocs-core/source";

import { getPostMarkdownUrl, getPostUrl, posts, source } from "@/lib/source";

export const revalidate = false;

export function GET() {
  const blog = posts.entries.map((post) => `- [${post.title}](${getPostUrl(post)}): ${getPostMarkdownUrl(post)}`);
  const content = `${llms(source).index()}\n\n## Blog\n\n${blog.join("\n")}\n`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
