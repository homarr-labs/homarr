import type { MetadataRoute } from "next";

import { apiSource } from "@/lib/openapi";
import { getPostUrl, posts, source } from "@/lib/source";

const baseUrl = process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: `${baseUrl}${page.url}`,
      changeFrequency: "monthly" as const,
      priority: page.slugs.length <= 1 ? 0.8 : 0.7,
    })),
    ...apiSource.getPages().map((page) => ({
      url: `${baseUrl}${page.url}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.entries.map((post) => ({
      url: `${baseUrl}${getPostUrl(post)}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    { url: `${baseUrl}/workshop`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/api-reference`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
