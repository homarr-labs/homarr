import type { MetadataRoute } from "next";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const serverSettings = await getRscServerSettingsAsync();
  const branding = serverSettings.branding;
  const appIcon = branding.logoImageUrl ?? branding.faviconImageUrl;
  const icons: NonNullable<MetadataRoute.Manifest["icons"]> = [
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
      purpose: "maskable",
    },
  ];

  if (appIcon) {
    icons.unshift({
      src: appIcon,
      sizes: "any",
      purpose: "any",
    });
  } else {
    icons.unshift(
      {
        src: "/images/pwa/192.maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/pwa/512.maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    );
  }

  return {
    name: branding.appName,
    short_name: branding.appName,
    description: "Your dashboard for managing your server.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: branding.primaryColor,
    icons,
  };
}
