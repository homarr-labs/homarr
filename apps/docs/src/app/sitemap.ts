import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/metadata";
import { apiSource } from "@/lib/openapi";
import { getPostUrl, posts, source } from "@/lib/source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: canonicalUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: canonicalUrl(page.url),
      changeFrequency: "monthly" as const,
      priority: page.slugs.length <= 1 ? 0.8 : 0.7,
    })),
    ...apiSource.getPages().map((page) => ({
      url: canonicalUrl(page.url),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.entries.map((post) => ({
      url: canonicalUrl(getPostUrl(post)),
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    { url: canonicalUrl("/workshop"), changeFrequency: "daily", priority: 0.7 },
    { url: canonicalUrl("/api-reference"), changeFrequency: "weekly", priority: 0.7 },
    { url: canonicalUrl("/about-us"), changeFrequency: "monthly", priority: 0.5 },
  ];
}
