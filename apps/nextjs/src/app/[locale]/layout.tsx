import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@homarr/ui/styles.css";
import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "~/styles/scroll-area.scss";

import { ColorSchemeScript, createTheme, MantineProvider } from "@mantine/core";

import { env } from "@homarr/auth/env.mjs";
import { auth } from "@homarr/auth/next";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";

import { Analytics } from "~/components/layout/analytics";
import { JotaiProvider } from "./_client-providers/jotai";
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

export default function Layout(props: { children: React.ReactNode; params: { locale: string } }) {
  const colorScheme = "dark";

  const StackedProvider = composeWrappers([
    async (innerProps) => {
      const session = await auth();
      return <AuthProvider session={session} logoutUrl={env.AUTH_LOGOUT_REDIRECT_URL} {...innerProps} />;
    },
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} />,
    (innerProps) => <NextInternationalProvider {...innerProps} locale={props.params.locale} />,
    (innerProps) => (
      <MantineProvider
        {...innerProps}
        defaultColorScheme="dark"
        theme={createTheme({
          primaryColor: "red",
          autoContrast: true,
        })}
      />
    ),
    (innerProps) => <ModalProvider {...innerProps} />,
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />
        <Analytics />
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
