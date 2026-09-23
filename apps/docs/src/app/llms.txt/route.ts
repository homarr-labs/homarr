import { docsLlms, getPostMarkdownUrl, getPostUrl, posts } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const blog = posts.entries.map(
    (post) => `- [${post.title}](${getPostUrl(post)}): [Markdown](${getPostMarkdownUrl(post)})`,
  );
  const index = await docsLlms.index();
  const content = `${index}\n\n## Blog\n\n${blog.join("\n")}\n`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
