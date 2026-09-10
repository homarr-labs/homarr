import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

import { OpenAPIPage } from "@/components/openapi-page";
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

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
