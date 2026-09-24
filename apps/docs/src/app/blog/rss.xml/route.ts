import { Feed } from "feed";

import { getPostExcerpt, getPostUrl, posts } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const siteUrl = (process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev").replace(/\/$/, "");
  const feed = new Feed({
    title: "Homarr blog",
    description: "Release notes, migration guides, and project updates from Homarr.",
    id: `${siteUrl}/blog`,
    link: `${siteUrl}/blog`,
    language: "en",
    favicon: `${siteUrl}/img/favicon.png`,
    feedLinks: { rss: `${siteUrl}/blog/rss.xml` },
    copyright: `Homarr contributors ${new Date().getUTCFullYear()}`,
  });

  for (const post of posts.entries.toSorted((left, right) => right.date.localeCompare(left.date))) {
    const link = `${siteUrl}${getPostUrl(post)}`;
    feed.addItem({
      title: post.title,
      id: link,
      link,
      date: new Date(post.date),
      author: post.authors.map((name) => ({ name })),
      description: await getPostExcerpt(post),
      category: post.tags?.map((name) => ({ name })),
    });
  }

  return new Response(feed.rss2(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
