import { createTheme, MantineProvider } from "@mantine/core";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import mantineCss from "@mantine/core/styles.css?url";
import { appHome, appUrl } from "../lib/base-path";
import appCss from "../styles.css?url";

const theme = createTheme({
  primaryColor: "violet",
  defaultRadius: "md",
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  headings: { fontFamily: '"Avenir Next", "Segoe UI", sans-serif', fontWeight: "650" },
  colors: {
    violet: [
      "#f4f1ff",
      "#ebe5fd",
      "#d6cafa",
      "#bdacf3",
      "#a48deb",
      "#8d73e3",
      "#765bd8",
      "#6245c0",
      "#5037a0",
      "#402b83",
    ],
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Homarr Remote" },
      { name: "description", content: "Your Homarr workers, connected privately." },
      { name: "referrer", content: "no-referrer" },
    ],
    links: [
      { rel: "stylesheet", href: mantineCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: appUrl("/favicon.svg"), type: "image/svg+xml" },
    ],
  }),
  component: Outlet,
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="route-error">
      <h1>Page not found</h1>
      <a href={appHome}>Return to your workers</a>
    </main>
  ),
  errorComponent: ({ reset }) => (
    <main className="route-error">
      <h1>We couldn't open this page.</h1>
      <p>Your worker credentials remain in this browser.</p>
      <button onClick={reset}>Try again</button>
    </main>
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="light">
          {children}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  );
}
