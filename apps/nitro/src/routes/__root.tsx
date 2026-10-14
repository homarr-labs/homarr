import { createRootRouteWithContext, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import { BootstrapScript } from "../app/bootstrap";
import { ApplicationProviders } from "../app/providers";
import {
  createPublicDocumentAttributes,
  createPublicDocumentMetadata,
  createPublicDocumentSnapshot,
} from "../app/preview-document";
import { publicColorSchemeScript } from "../app/public-providers";
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
  const { bootstrap, queryClient, providers, colorSchemeManager } = Route.useRouteContext();
  const { snapshot, assets } = bootstrap;
  const documentSnapshot = createPublicDocumentSnapshot(bootstrap);
  const attributes = createPublicDocumentAttributes(documentSnapshot);
  const metadata = createPublicDocumentMetadata(documentSnapshot);
  return (
    <html
      {...attributes.html}
      lang={attributes.html.lang}
      data-mantine-color-scheme={bootstrap.colorScheme}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <script
          data-mantine-script
          dangerouslySetInnerHTML={{ __html: publicColorSchemeScript(bootstrap.colorScheme) }}
        />
        {assets.css.map((asset) => (
          <link key={asset.href} rel="stylesheet" {...asset} />
        ))}
        {assets.js.map((asset) => (
          <link key={asset.href} rel="modulepreload" {...asset} />
        ))}
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={metadata.primaryColor} />
        <meta property="og:title" content={metadata.dashboardTitle} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:url" content={metadata.websiteUrl} />
        <meta property="og:site_name" content={metadata.title} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metadata.dashboardTitle} />
        <meta name="twitter:description" content={metadata.description} />
        <link rel="icon" href={metadata.favicon} />
        <link rel="apple-touch-icon" href={metadata.logo} />
        <link rel="apple-touch-startup-image" href={metadata.logo} />
        <meta name="apple-mobile-web-app-title" content={metadata.title} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={metadata.appleStatusBarStyle} />
        <meta name="homarr-website-url" content={metadata.websiteUrl} />
        <style data-homarr-global-custom-css>{metadata.customCss}</style>
      </head>
      <body {...attributes.body}>
        <ApplicationProviders
          snapshot={snapshot}
          queryClient={queryClient}
          contributions={providers}
          publicSettings={bootstrap.publicSettings}
          colorScheme={bootstrap.colorScheme}
          colorSchemeManager={colorSchemeManager}
        >
          <Outlet />
        </ApplicationProviders>
        <BootstrapScript bootstrap={bootstrap} />
        <Scripts />
        {assets.entry && <script type="module" src={assets.entry} />}
      </body>
    </html>
  );
}
