import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";

import { headers } from "next/headers";

import { Notifications } from "@homarr/notifications";
import {
  ColorSchemeScript,
  MantineProvider,
  uiConfiguration,
} from "@homarr/ui";

import { JotaiProvider } from "./_client-providers/jotai";
import { ModalsProvider } from "./_client-providers/modals";
import { NextInternationalProvider } from "./_client-providers/next-international";
import { TRPCReactProvider } from "./_client-providers/trpc";
import { composeWrappers } from "./compose";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

/**
 * Since we're passing `headers()` to the `TRPCReactProvider` we need to
 * make the entire app dynamic. You can move the `TRPCReactProvider` further
 * down the tree (e.g. /dashboard and onwards) to make part of the app statically rendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create T3 Turbo",
  description: "Simple monorepo with shared backend for web & mobile apps",
};

export default function Layout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const colorScheme = "dark";

  const StackedProvider = composeWrappers([
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} headers={headers()} />,
    (innerProps) => (
      <NextInternationalProvider {...innerProps} locale={props.params.locale} />
    ),
    (innerProps) => (
      <MantineProvider
        {...innerProps}
        defaultColorScheme={colorScheme}
        {...uiConfiguration}
      />
    ),
    (innerProps) => <ModalsProvider {...innerProps} />,
  ]);

  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />
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
