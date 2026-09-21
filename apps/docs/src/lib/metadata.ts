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
  image: socialImage,
}: {
  title: string;
  description: string;
  path: string;
  publishedTime?: string;
  authors?: string[];
  image?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const socialTitle = title === "Homarr documentation" ? title : `${title} | Homarr documentation`;
  const image = socialImage
    ? { ...socialImage, url: new URL(socialImage.url, siteUrl).href }
    : { url: new URL("/img/logo.png", siteUrl).href, width: 484, height: 329, alt: "Homarr" };
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
      card: socialImage ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
