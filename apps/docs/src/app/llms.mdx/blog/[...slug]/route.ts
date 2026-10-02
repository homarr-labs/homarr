import { notFound } from "next/navigation";

import { getPostBySegments, getPostLLMText, getPostSegments, posts } from "@/lib/source";

export const revalidate = false;

interface RouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const post = getPostBySegments(slug.slice(0, -1));
  if (!post) notFound();

  return new Response(await getPostLLMText(post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return posts.entries.map((post) => ({ slug: [...getPostSegments(post), "content.md"] }));
}
