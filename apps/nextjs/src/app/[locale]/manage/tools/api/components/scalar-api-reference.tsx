"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import { useResourceFetch } from "@homarr/worker-client/resources";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

export function ScalarApiReference() {
  const resourceFetch = useResourceFetch();
  const colorScheme = useComputedColorScheme("light");
  const configuration = useMemo<ComponentProps<typeof ApiReferenceReact>["configuration"]>(
    () => ({
      url: "/api/openapi?format=scalar",
      fetch: resourceFetch,
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
    [colorScheme, resourceFetch],
  );

  return <ApiReferenceReact configuration={configuration} />;
}
