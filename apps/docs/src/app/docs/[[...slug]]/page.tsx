import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findNeighbour } from "fumadocs-core/page-tree";
import {
  DocsBody,
  DocsDescription,
  EditOnGitHub,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";

import { getMDXComponents } from "@/components/mdx";
import { getPageMarkdownUrl, source } from "@/lib/source";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const sourcePath = `apps/docs/docs/${page.path}`;
  const hasLegacyBodyTitle = !page.data.hide_title && page.data.toc[0]?.depth === 1;
  const toc = hasLegacyBodyTitle ? page.data.toc.filter((item) => item.depth !== 1) : page.data.toc;
  const isInstallationGuide =
    page.slugs.length > 2 && page.slugs[0] === "getting-started" && page.slugs[1] === "installation";
  const footerItems = isInstallationGuide
    ? {
        ...findNeighbour(source.pageTree, page.url),
        next: {
          name: "After the installation",
          description: "Complete onboarding and configure your first board.",
          url: "/docs/getting-started/after-the-installation",
        },
      }
    : undefined;

  return (
    <DocsPage toc={toc} full={page.data.full} footer={footerItems ? { items: footerItems } : undefined}>
      {!page.data.hide_title && (
        <>
          <DocsTitle className="homarr-docs-title">{page.data.title}</DocsTitle>
          {page.data.description && (
            <DocsDescription className="homarr-docs-description mb-0">{page.data.description}</DocsDescription>
          )}
        </>
      )}
      <div className="homarr-page-actions" role="group" aria-label="Page actions">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/homarr-labs/homarr/blob/release/v2/${sourcePath}`}
        />
      </div>
      <DocsBody className={hasLegacyBodyTitle ? "homarr-docs-body--hide-title" : undefined}>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <div className="mt-8 border-t pt-6">
        <EditOnGitHub href={`https://github.com/homarr-labs/homarr/edit/release/v2/${sourcePath}`}>
          Edit this page
        </EditOnGitHub>
      </div>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
    },
  };
}
