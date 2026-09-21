import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";

import { getBlogAuthor } from "@/lib/blog-authors";
import { getPostUrl, posts } from "@/lib/source";

const blogMetadata = pageMetadata({
  path: "/blog",
  title: "Blog",
  description: "Release notes, migration guides, and project updates from Homarr.",
});

export const metadata = {
  ...blogMetadata,
  alternates: { ...blogMetadata.alternates, types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogIndexPage() {
  const entries = posts.entries.toSorted((left, right) => right.date.localeCompare(left.date));

  return (
    <main className="homarr-content-page max-w-4xl">
      <header className="homarr-content-header max-w-2xl">
        <p className="text-sm font-medium text-fd-primary">Homarr project</p>
        <h1 className="homarr-content-title mt-2">Blog</h1>
        <p className="homarr-content-lead">Release notes, migration guides, and project updates.</p>
      </header>
      <div className="divide-y">
        {entries.map((post) => (
          <article key={post.info.path} className="py-7">
            <time className="text-sm text-fd-muted-foreground" dateTime={post.date}>
              {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.date))}
            </time>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              <Link className="hover:text-fd-primary" href={getPostUrl(post)}>
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 flex flex-wrap gap-x-1 text-sm text-fd-muted-foreground">
              <span>By</span>
              {post.authors.map((author, index) => {
                const profile = getBlogAuthor(author);

                return (
                  <span key={author}>
                    <a
                      href={`https://github.com/${profile.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-fd-primary hover:underline"
                    >
                      {profile.name}
                    </a>
                    {index < post.authors.length - 1 ? "," : null}
                  </span>
                );
              })}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
