import { docsLlms, getPostLLMText, posts } from "@/lib/source";
import { apiSource } from "@/lib/openapi";
import { getApiMarkdown } from "@/lib/openapi-markdown";

export const revalidate = false;

export async function GET() {
  const pages = await Promise.all([
    docsLlms.full(),
    ...posts.entries.map(getPostLLMText),
    ...apiSource.getPages().map(getApiMarkdown),
  ]);

  return new Response(pages.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
