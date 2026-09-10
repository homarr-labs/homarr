import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { Analytics } from "@/components/analytics";
import { Provider } from "@/components/provider";

import "./global.css";

const siteUrl = process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev";

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
      </body>
    </html>
  );
}
