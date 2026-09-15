import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

import { OpenAPIPage } from "@/components/openapi-page";
import { pageMetadata } from "@/lib/metadata";
import { apiSource } from "@/lib/openapi";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function ApiPage({ params }: PageProps) {
  const { slug } = await params;
  const page = apiSource.getPage(slug);
  if (!page) notFound();

  return (
    <DocsPage toc={page.data.toc} full>
      <DocsTitle>{page.data.title}</DocsTitle>
      <OpenAPIPage {...page.data.getOpenAPIPageProps()} />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return apiSource.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = apiSource.getPage(slug);
  if (!page) notFound();

  const title = page.data.title ?? "API reference";
  return pageMetadata({
    title,
    description: page.data.description ?? `Request parameters and responses for ${title} in the Homarr HTTP API.`,
    path: page.url,
  });
}
