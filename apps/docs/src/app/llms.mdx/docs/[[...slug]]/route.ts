import { notFound } from "next/navigation";

import { getLLMText, getPageMarkdownUrl, source } from "@/lib/source";

export const revalidate = false;

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageMarkdownUrl(page).segments,
  }));
}
