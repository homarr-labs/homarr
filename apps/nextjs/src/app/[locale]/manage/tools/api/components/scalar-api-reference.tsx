"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";
import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

interface ScalarApiReferenceProps {
  document: object;
}

export function ScalarApiReference({ document }: ScalarApiReferenceProps) {
  const colorScheme = useComputedColorScheme("light");
  const configuration = useMemo<ComponentProps<typeof ApiReferenceReact>["configuration"]>(
    () => ({
      content: document,
      layout: "classic",
      theme: "alternate",
      showSidebar: false,
      hideDarkModeToggle: true,
      hideSearch: true,
      hiddenClients: true,
      showDeveloperTools: "never",
      forceDarkModeState: colorScheme,
      authentication: {
        preferredSecurityScheme: "apikey",
      },
    }),
    [document, colorScheme],
  );

  return <ApiReferenceReact configuration={configuration} />;
}
