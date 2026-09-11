import type { MetadataRoute } from "next";

const baseUrl = process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
