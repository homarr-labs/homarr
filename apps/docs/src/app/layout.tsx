import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { Analytics } from "@/components/analytics";
import { Provider } from "@/components/provider";

import "./global.css";

const siteUrl = process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev";
const kapaWebsiteId = process.env.KAPA_WEBSITE_ID ?? "1e4656f4-abeb-4343-bbae-1d8626f52378";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Homarr documentation",
    template: "%s | Homarr documentation",
  },
  description: "Install, configure, operate, and extend Homarr.",
  keywords: ["Homarr", "dashboard", "self-hosted", "documentation"],
  icons: {
    icon: "/img/favicon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171719" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-fd-background text-fd-foreground antialiased">
        <Script src="/workshop-runtime-config.js" strategy="beforeInteractive" />
        <Provider>{children}</Provider>
        <Analytics />
        {kapaWebsiteId && (
          <Script
            id="kapa-widget"
            src="https://widget.kapa.ai/kapa-widget.bundle.js"
            strategy="afterInteractive"
            data-website-id={kapaWebsiteId}
            data-project-name="Homarr"
            data-project-color="#2B2B2B"
            data-project-logo={new URL("/img/favicon.png", siteUrl).href}
            data-modal-open-on-command-k="false"
          />
        )}
      </body>
    </html>
  );
}
