import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconBrandGithub } from "@tabler/icons-react";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { DocsBody, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";

import homarrV2SocialImage from "@site/blog/2026/09-03-homarr-2.0/img/homarr-v2-recap.webp";

import { getBlogAuthor } from "@/lib/blog-authors";
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

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

function BlogArchive({ currentPath }: { currentPath: string }) {
  const recentPosts = posts.entries.toSorted((left, right) => right.date.localeCompare(left.date)).slice(0, 5);
  const years = [...new Set(recentPosts.map((post) => post.date.slice(0, 4)))];

  return (
    <aside className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] self-start overflow-y-auto 2xl:block">
      <h2 className="text-base font-semibold">Recent posts</h2>
      <div className="mt-5 space-y-6">
        {years.map((year) => (
          <section key={year} aria-labelledby={`blog-year-${year}`}>
            <h3 id={`blog-year-${year}`} className="text-sm font-semibold text-fd-muted-foreground">
              {year}
            </h3>
            <ul className="mt-2 space-y-2.5 text-sm leading-5">
              {recentPosts
                .filter((post) => post.date.startsWith(year))
                .map((post) => {
                  const url = getPostUrl(post);
                  return (
                    <li key={post.info.path}>
                      <Link
                        href={url}
                        aria-current={url === currentPath ? "page" : undefined}
                        className={
                          url === currentPath
                            ? "font-medium text-fd-primary"
                            : "text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                        }
                      >
                        {post.title}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
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
  const postUrl = getPostUrl(post);
  const rawPost = await post.getText("raw");
  const readingMinutes = Math.max(1, Math.ceil(rawPost.split(/\s+/).length / 220));

  return (
    <main className="mx-auto grid w-full max-w-[100rem] gap-x-8 px-5 py-10 sm:px-8 lg:py-14 xl:grid-cols-[minmax(0,60rem)_15rem] xl:justify-center 2xl:grid-cols-[15rem_minmax(0,60rem)_15rem]">
      <BlogArchive currentPath={postUrl} />
      <article className="min-w-0">
        <header className="pb-8">
          <p className="text-sm text-fd-muted-foreground">
            <time dateTime={post.date}>{dateFormatter.format(new Date(post.date))}</time>
            <span aria-hidden="true"> · </span>
            {readingMinutes} min read
          </p>
          <h1
            id={bodyTitleId}
            className="mt-3 text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-[750] tracking-[-0.035em] text-balance"
          >
            {post.title}
          </h1>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <ul className="flex min-w-0 flex-wrap gap-x-5 gap-y-3" aria-label="Authors">
              {post.authors.map((author) => {
                const profile = getBlogAuthor(author);

                return (
                  <li key={author}>
                    <a
                      href={`https://github.com/${profile.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3"
                    >
                      <img
                        src={profile.image}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 rounded-full bg-fd-muted object-cover"
                      />
                      <span>
                        <span className="block text-sm font-semibold group-hover:text-fd-primary">{profile.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-fd-muted-foreground">
                          <IconBrandGithub aria-hidden size={14} />@{profile.github}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end" role="group" aria-label="Post actions">
              <MarkdownCopyButton markdownUrl={markdownUrl} />
              <ViewOptionsPopover
                markdownUrl={markdownUrl}
                githubUrl={`https://github.com/homarr-labs/homarr/blob/release/v2/apps/docs/blog/${post.info.path}`}
              />
            </div>
          </div>
        </header>
        <DocsBody className="homarr-blog-body border-t pt-8">
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

  const image = getPostUrl(post) === "/blog/2026/09/03/homarr-2.0" ? homarrV2SocialImage : undefined;

  return pageMetadata({
    title: post.title,
    description: post.description ?? (await getPostExcerpt(post)).slice(0, 180),
    path: getPostUrl(post),
    authors: post.authors,
    publishedTime: post.date,
    image: image
      ? {
          url: image.src,
          width: image.width,
          height: image.height,
          alt: `${post.title} release overview`,
        }
      : undefined,
  });
}
