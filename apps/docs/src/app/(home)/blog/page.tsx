import type { Metadata } from "next";
import Link from "next/link";

import { getPostUrl, posts } from "@/lib/source";

export const metadata: Metadata = {
  title: "Blog",
  description: "Release notes, migration guides, and project updates from Homarr.",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogIndexPage() {
  const entries = posts.entries.toSorted((left, right) => right.date.localeCompare(left.date));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
      <header className="max-w-2xl border-b pb-10">
        <p className="text-sm font-medium text-fd-primary">Homarr project</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-4 text-lg text-fd-muted-foreground">Release notes, migration guides, and project updates.</p>
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
            <p className="mt-2 text-sm text-fd-muted-foreground">By {post.authors.join(", ")}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
