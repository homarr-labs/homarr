"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { lazy, type ReactNode } from "react";

const Search = lazy(() => import("./search"));

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ SearchDialog: Search, preload: false }}
      theme={{ attribute: ["class", "data-theme"], defaultTheme: "system", enableSystem: true }}
    >
      {children}
    </RootProvider>
  );
}
