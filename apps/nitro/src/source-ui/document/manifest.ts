import type { OriginalDocumentBranding } from "./contracts";

export interface OriginalManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose: "any" | "maskable";
}

export function createOriginalWebAppManifest(branding: OriginalDocumentBranding) {
  const appIcon = branding.logoImageUrl ?? branding.faviconImageUrl;
  const icons: OriginalManifestIcon[] = [
    { src: "/images/pwa/192.maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/images/pwa/512.maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];

  if (appIcon) {
    icons.unshift({ src: appIcon, sizes: "any", purpose: "any" });
  } else {
    icons.unshift(
      { src: "/images/pwa/192.maskable.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/pwa/512.maskable.png", sizes: "512x512", type: "image/png", purpose: "any" },
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
