import type { Metadata } from "next";

import { StaticRedirect } from "@/components/static-redirect";
import { canonicalUrl } from "@/lib/metadata";
import { getPostUrl, posts } from "@/lib/source";

function latestPost() {
  const post = posts.entries.toSorted((left, right) => right.date.localeCompare(left.date))[0];
  if (!post) throw new Error("The blog redirect requires a published article");
  return post;
}

export function generateMetadata(): Metadata {
  const post = latestPost();
  return {
    title: post.title,
    alternates: { canonical: canonicalUrl(getPostUrl(post)) },
    robots: { index: false, follow: true },
  };
}

export default function BlogIndexPage() {
  const post = latestPost();
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Latest Homarr news</h1>
      <StaticRedirect href={`${getPostUrl(post)}/`} label={post.title} />
    </main>
  );
}
