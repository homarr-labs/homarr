import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { DocsBody, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";

import { getMDXComponents } from "@/components/mdx";
import { getPostBySegments, getPostMarkdownUrl, getPostSegments, getPostUrl, posts } from "@/lib/source";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySegments(slug);
  if (!post) notFound();

  const MDX = post.body;
  const markdownUrl = getPostMarkdownUrl(post);
  const hasBodyTitle = post.toc[0]?.depth === 1;
  const toc = hasBodyTitle ? post.toc.filter((item) => item.depth !== 1) : post.toc;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
      <article>
        <header className="border-b pb-8">
          <time className="text-sm text-fd-muted-foreground" dateTime={post.date}>
            {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.date))}
          </time>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">{post.title}</h1>
          <p className="mt-3 text-sm text-fd-muted-foreground">By {post.authors.join(", ")}</p>
          <div className="homarr-page-actions" role="group" aria-label="Post actions">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/homarr-labs/homarr/blob/release/v2/apps/docs/blog/${post.info.path}`}
            />
          </div>
        </header>
        <DocsBody className={hasBodyTitle ? "homarr-docs-body--hide-title pt-8" : "pt-8"}>
          <InlineTOC items={toc} />
          <MDX components={getMDXComponents()} />
        </DocsBody>
      </article>
    </main>
  );
}

export function generateStaticParams() {
  return posts.entries.map((post) => ({ slug: getPostSegments(post) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySegments(slug);
  if (!post) notFound();

  return {
    title: post.title,
    alternates: { canonical: getPostUrl(post) },
    authors: post.authors.map((name) => ({ name })),
  };
}
