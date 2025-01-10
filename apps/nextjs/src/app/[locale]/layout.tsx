import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";
import "~/styles/scroll-area.scss";

import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { env } from "@homarr/auth/env.mjs";
import { auth } from "@homarr/auth/next";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SpotlightProvider } from "@homarr/spotlight";
import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleRTL, isLocaleSupported } from "@homarr/translation";
import { getI18nMessages } from "@homarr/translation/server";

import { Analytics } from "~/components/layout/analytics";
import { SearchEngineOptimization } from "~/components/layout/search-engine-optimization";
import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
import { DayJsLoader } from "./_client-providers/dayjs-loader";
import { JotaiProvider } from "./_client-providers/jotai";
import { CustomMantineProvider } from "./_client-providers/mantine";
import { AuthProvider } from "./_client-providers/session";
import { TRPCReactProvider } from "./_client-providers/trpc";
import { composeWrappers } from "./compose";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// eslint-disable-next-line no-restricted-syntax
export const generateMetadata = async (): Promise<Metadata> => ({
  title: "Homarr",
  description:
    "Simplify the management of your server with Homarr - a sleek, modern dashboard that puts all of your apps and services at your fingertips.",
  openGraph: {
    title: "Homarr Dashboard",
    description:
      "Simplify the management of your server with Homarr - a sleek, modern dashboard that puts all of your apps and services at your fingertips.",
    url: "https://homarr.dev",
    siteName: "Homarr Documentation",
  },
  icons: {
    icon: "/logo/logo.png",
    apple: "/logo/logo.png",
  },
  appleWebApp: {
    title: "Homarr",
    capable: true,
    startupImage: { url: "/logo/logo.png" },
    statusBarStyle: (await getCurrentColorSchemeAsync()) === "dark" ? "black-translucent" : "default",
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
  if (!isLocaleSupported((await props.params).locale)) {
    notFound();
  }

  const session = await auth();
  const colorScheme = await getCurrentColorSchemeAsync();
  const direction = isLocaleRTL((await props.params).locale) ? "rtl" : "ltr";
  const i18nMessages = await getI18nMessages();

  const StackedProvider = composeWrappers([
    (innerProps) => {
      return <AuthProvider session={session} logoutUrl={env.AUTH_LOGOUT_REDIRECT_URL} {...innerProps} />;
    },
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} />,
    (innerProps) => <DayJsLoader {...innerProps} />,
    (innerProps) => <NextIntlClientProvider {...innerProps} messages={i18nMessages} />,
    (innerProps) => <CustomMantineProvider {...innerProps} defaultColorScheme={colorScheme} />,
    (innerProps) => <ModalProvider {...innerProps} />,
    (innerProps) => <SpotlightProvider {...innerProps} />,
  ]);

  return (
    // Instead of ColorSchemScript we use data-mantine-color-scheme to prevent flickering
    <html
      lang={(await props.params).locale}
      dir={direction}
      data-mantine-color-scheme={colorScheme}
      style={{
        backgroundColor: colorScheme === "dark" ? "#242424" : "#fff",
      }}
      suppressHydrationWarning
    >
      <head>
        <Analytics />
        <SearchEngineOptimization />
      </head>
      <body className={["font-sans", fontSans.variable].join(" ")}>
        <StackedProvider>
          <Notifications />
          {props.children}
        </StackedProvider>
      </body>
    </html>
  );
}
