import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { ColorSchemeScript } from "@mantine/core";

import "@gfazioli/mantine-onboarding-tour/styles.css";
import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";
import "mantine-datatable/styles.css";
import "~/styles/color-scheme.scss";
import "~/styles/scroll-area.scss";

import { notFound } from "next/navigation";

import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleRTL, isLocaleSupported } from "@homarr/translation";

import { SearchEngineOptimization } from "~/components/layout/search-engine-optimization";
import { CrowdinLiveTranslation } from "~/components/layout/crowdin-live-translation";
import { SessionScopedProviders } from "./_session-scoped-providers";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const generateMetadata = async (): Promise<Metadata> => ({
  title: "Homarr",
  description:
    "A self-hosted dashboard for the *arr stack and your entire homelab. Integrates with 50+ services, real-time widgets, no config files.",
  openGraph: {
    title: "Homarr Dashboard",
    description:
      "A self-hosted dashboard for the *arr stack and your entire homelab. Integrates with 50+ services, real-time widgets, no config files.",
    url: "https://homarr.dev",
    siteName: "Homarr",
  },
  icons: {
    icon: "/logo/logo.png",
    apple: "/logo/logo.png",
  },
  appleWebApp: {
    title: "Homarr",
    capable: true,
    startupImage: { url: "/logo/logo.png" },
    statusBarStyle: "default",
  },
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: SupportedLanguage }>;
}) {
  const { locale } = await props.params;
  if (!isLocaleSupported(locale)) {
    notFound();
  }

  const direction = isLocaleRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
        <SearchEngineOptimization />
        <CrowdinLiveTranslation locale={locale} />
      </head>
      <body className={[fontSans.className, fontSans.variable].join(" ")} suppressHydrationWarning>
        <Suspense>
          <SessionScopedProviders>{props.children}</SessionScopedProviders>
        </Suspense>
      </body>
    </html>
  );
}
