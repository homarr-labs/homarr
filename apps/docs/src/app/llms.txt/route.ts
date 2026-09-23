import { docsLlms, getPostMarkdownUrl, getPostUrl, posts } from "@/lib/source";
import { apiSource } from "@/lib/openapi";

export const revalidate = false;

export async function GET() {
  const blog = posts.entries.map(
    (post) => `- [${post.title}](${getPostUrl(post)}): [Markdown](${getPostMarkdownUrl(post)})`,
  );
  const index = await docsLlms.index();
  const api = apiSource
    .getPages()
    .map((page) => `- [${page.data.title}](${page.url}): [Markdown](/llms.mdx${page.url}/content.md)`);
  const content = `${index}\n\n## Blog\n\n${blog.join("\n")}\n\n## HTTP API\n\n${api.join("\n")}\n`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
