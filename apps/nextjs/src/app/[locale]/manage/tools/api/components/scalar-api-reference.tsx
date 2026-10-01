"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

export function ScalarApiReference() {
  const colorScheme = useComputedColorScheme("light");
  const configuration = useMemo<ComponentProps<typeof ApiReferenceReact>["configuration"]>(
    () => ({
      url: "/api/openapi?format=scalar",
      layout: "classic",
      theme: "alternate",
      showSidebar: false,
      hideDarkModeToggle: true,
      hideSearch: true,
      hiddenClients: true,
      showDeveloperTools: "never",
      defaultOpenAllTags: false,
      forceDarkModeState: colorScheme,
      authentication: {
        preferredSecurityScheme: "apikey",
      },
    }),
    [colorScheme],
  );

  return <ApiReferenceReact configuration={configuration} />;
}
