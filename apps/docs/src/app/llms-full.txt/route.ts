import { docsLlms, getPostLLMText, posts } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const pages = await Promise.all([docsLlms.full(), ...posts.entries.map(getPostLLMText)]);

  return new Response(pages.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
