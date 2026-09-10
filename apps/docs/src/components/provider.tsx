"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import Search from "./search";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ SearchDialog: Search }}
      theme={{ attribute: ["class", "data-theme"], defaultTheme: "system", enableSystem: true }}
    >
      {children}
    </RootProvider>
  );
}
