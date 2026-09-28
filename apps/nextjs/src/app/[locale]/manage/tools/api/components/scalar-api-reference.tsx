"use client";

import { useMemo } from "react";
import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

export function ScalarApiReference() {
  const colorScheme = useComputedColorScheme("light");
  const configuration = useMemo(
    () => ({
      url: "/api/openapi",
      layout: "classic" as const,
      theme: "alternate" as const,
      showSidebar: false,
      hideDarkModeToggle: true,
      hideSearch: true,
      hiddenClients: true as const,
      showDeveloperTools: "never" as const,
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
