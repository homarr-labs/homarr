import { notFound } from "next/navigation";

import { apiSource } from "@/lib/openapi";
import { getApiMarkdown, getApiMarkdownUrl } from "@/lib/openapi-markdown";

export const revalidate = false;

interface RouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const page = apiSource.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new Response(getApiMarkdown(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return apiSource.getPages().map((page) => ({ slug: getApiMarkdownUrl(page).segments }));
}
