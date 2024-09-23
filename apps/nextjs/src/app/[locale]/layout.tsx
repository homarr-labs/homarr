import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";
import "~/styles/scroll-area.scss";

import { cookies } from "next/headers";

import { env } from "@homarr/auth/env.mjs";
import { auth } from "@homarr/auth/next";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";

import { Analytics } from "~/components/layout/analytics";
import { SearchEngineOptimization } from "~/components/layout/search-engine-optimization";
import { JotaiProvider } from "./_client-providers/jotai";
import { CustomMantineProvider } from "./_client-providers/mantine";
import { NextInternationalProvider } from "./_client-providers/next-international";
import { AuthProvider } from "./_client-providers/session";
import { TRPCReactProvider } from "./_client-providers/trpc";
import { composeWrappers } from "./compose";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
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
  twitter: {
    card: "summary_large_image",
    site: "@jullerino",
    creator: "@jullerino",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function Layout(props: { children: React.ReactNode; params: { locale: string } }) {
  const session = await auth();
  const colorScheme = cookies().get("homarr-color-scheme")?.value ?? "light";

  const StackedProvider = composeWrappers([
    (innerProps) => {
      return <AuthProvider session={session} logoutUrl={env.AUTH_LOGOUT_REDIRECT_URL} {...innerProps} />;
    },
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} />,
    (innerProps) => <NextInternationalProvider {...innerProps} locale={props.params.locale} />,
    (innerProps) => <CustomMantineProvider {...innerProps} />,
    (innerProps) => <ModalProvider {...innerProps} />,
  ]);

  return (
    // Instead of ColorSchemScript we use data-mantine-color-scheme to prevent flickering
    <html lang="en" data-mantine-color-scheme={colorScheme} suppressHydrationWarning>
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
