import { createRootRouteWithContext, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import { BootstrapScript } from "../app/bootstrap";
import { ApplicationProviders } from "../app/providers";
import type { RouterContext } from "../app/router";
import { RouteError, RouteNotFound, RoutePending } from "./-components/recovery";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootDocument,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function RootDocument() {
  useEffect(() => {
    document.documentElement.dataset.hydration ??= "ready";
  }, []);
  const { bootstrap, queryClient, providers } = Route.useRouteContext();
  const { snapshot, assets } = bootstrap;
  return (
    <html lang={snapshot.locale} dir={snapshot.direction} data-mantine-color-scheme={snapshot.theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Homarr</title>
        {assets.css.map((asset) => (
          <link key={asset.href} rel="stylesheet" {...asset} />
        ))}
        {assets.js.map((asset) => (
          <link key={asset.href} rel="modulepreload" {...asset} />
        ))}
      </head>
      <body>
        <ApplicationProviders snapshot={snapshot} queryClient={queryClient} contributions={providers}>
          <Outlet />
        </ApplicationProviders>
        <BootstrapScript bootstrap={bootstrap} />
        <Scripts />
        {assets.entry && <script type="module" src={assets.entry} />}
      </body>
    </html>
  );
}
