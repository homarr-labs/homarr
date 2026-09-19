import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";

const themeColors = {
  light: "#fff",
  dark: "#242424",
} as const;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const colorScheme = await getCurrentColorSchemeAsync();
  const resolvedColorScheme =
    colorScheme === "auto"
      ? (await headers()).get("sec-ch-prefers-color-scheme") === "dark"
        ? "dark"
        : "light"
      : colorScheme;

  const themeColor = themeColors[resolvedColorScheme];

  return {
    name: "Homarr",
    short_name: "Homarr",
    description: "Your dashboard for managing your server.",
    start_url: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      {
        src: "/images/pwa/192.maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/pwa/192.maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/pwa/512.maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/pwa/512.maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
