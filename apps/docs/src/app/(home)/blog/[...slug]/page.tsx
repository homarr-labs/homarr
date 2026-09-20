import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { DocsBody, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";

import { pageMetadata } from "@/lib/metadata";
import { BlogToc } from "@/components/blog/blog-toc";
import { getMDXComponents } from "@/components/mdx";
import {
  getPostBySegments,
  getPostExcerpt,
  getPostMarkdownUrl,
  getPostSegments,
  getPostUrl,
  posts,
} from "@/lib/source";

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
  const bodyTitleId = hasBodyTitle ? decodeURIComponent(post.toc[0].url.slice(1)) : undefined;
  const toc = hasBodyTitle ? post.toc.filter((item) => item.depth !== 1) : post.toc;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:py-16 xl:grid-cols-[minmax(0,52rem)_16rem]">
      <article className="min-w-0">
        <header className="border-b pb-8">
          <time className="text-sm text-fd-muted-foreground" dateTime={post.date}>
            {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.date))}
          </time>
          <h1 id={bodyTitleId} className="homarr-content-title mt-3">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-fd-muted-foreground">By {post.authors.join(", ")}</p>
          <div className="homarr-page-actions" role="group" aria-label="Post actions">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover
              markdownUrl={markdownUrl}
              githubUrl={`https://github.com/homarr-labs/homarr/blob/release/v2/apps/docs/blog/${post.info.path}`}
            />
          </div>
        </header>
        <DocsBody className="pt-8">
          <InlineTOC className="xl:hidden" items={toc} />
          <MDX
            components={getMDXComponents({
              h1: ({ id, children, ...props }) =>
                bodyTitleId && id === bodyTitleId ? null : (
                  <h2 id={id} {...props}>
                    {children}
                  </h2>
                ),
            })}
          />
        </DocsBody>
      </article>
      <BlogToc items={toc} />
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

  return pageMetadata({
    title: post.title,
    description: post.description ?? (await getPostExcerpt(post)).slice(0, 180),
    path: getPostUrl(post),
    authors: post.authors,
    publishedTime: post.date,
  });
}
