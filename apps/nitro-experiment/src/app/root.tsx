import { MantineProvider } from "@mantine/core";
import { Outlet, Scripts, useRouter } from "@tanstack/react-router";

import { BootstrapScript } from "../features/viewer/document-state";

export function AppRoot() {
  const { assets, bootstrap } = useRouter().options.context;
  return (
    <html lang="en" data-mantine-color-scheme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Nitro fixture experiment</title>
        {assets.css.map((asset) => (
          <link key={asset.href} rel="stylesheet" {...asset} />
        ))}
        {assets.js.map((asset) => (
          <link key={asset.href} rel="modulepreload" {...asset} />
        ))}
      </head>
      <body>
        <MantineProvider forceColorScheme="light">
          <Outlet />
        </MantineProvider>
        <BootstrapScript bootstrap={bootstrap} />
        <Scripts />
        {assets.entry && <script type="module" src={assets.entry} />}
      </body>
    </html>
  );
}
