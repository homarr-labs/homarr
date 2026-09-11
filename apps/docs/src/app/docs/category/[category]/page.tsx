import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

import { LegacyCategoryRedirect } from "@/components/docs/legacy-category-redirect";
import { source } from "@/lib/source";

// Docusaurus generated these URLs from category labels, not directory names.
const categories: Record<string, string> = {
  advanced: "advanced",
  "developer-guides": "advanced/development/getting-started",
  community: "community",
  "getting-started": "getting-started",
  installation: "getting-started/installation",
  integrations: "integrations",
  management: "management",
  widgets: "widgets",
};

interface PageProps {
  params: Promise<{ category: string }>;
}

async function getCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const destination = Object.hasOwn(categories, category) && categories[category];
  if (!destination) notFound();
  const page = source.getPage(destination.split("/"));
  if (!page) throw new Error(`Missing documentation destination for legacy category: ${category}`);
  return page;
}

export default async function LegacyCategoryPage(props: PageProps) {
  const page = await getCategoryPage(props);

  return (
    <DocsPage tableOfContent={{ enabled: false }}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <p>This documentation has moved to a new address.</p>
        <LegacyCategoryRedirect href={`${page.url}/`} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(categories).map((category) => ({ category }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const page = await getCategoryPage(props);
  return {
    title: page.data.title,
    alternates: { canonical: page.url },
    robots: { index: false, follow: true },
  };
}
