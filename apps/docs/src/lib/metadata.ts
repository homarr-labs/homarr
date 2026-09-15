import type { Metadata } from "next";

export const siteUrl = new URL(process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev");

export function canonicalUrl(pathname: string) {
  return new URL(`${pathname.replace(/\/$/, "")}/`, siteUrl).href;
}

export function pageMetadata({
  title,
  description,
  path,
  publishedTime,
  authors,
}: {
  title: string;
  description: string;
  path: string;
  publishedTime?: string;
  authors?: string[];
}): Metadata {
  const socialTitle = title === "Homarr documentation" ? title : `${title} | Homarr documentation`;
  const image = { url: new URL("/img/logo.png", siteUrl).href, width: 484, height: 329, alt: "Homarr" };
  return {
    title: { absolute: socialTitle },
    description,
    alternates: { canonical: canonicalUrl(path) },
    authors: authors?.map((name) => ({ name })),
    openGraph: {
      title: socialTitle,
      description,
      url: canonicalUrl(path),
      siteName: "Homarr",
      locale: "en_US",
      images: [image],
      ...(publishedTime ? { type: "article", publishedTime, authors } : { type: "website" }),
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
