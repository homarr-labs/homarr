"use client";

import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

interface ScalarApiReferenceProps {
  document: object;
}

export function ScalarApiReference({ document }: ScalarApiReferenceProps) {
  const colorScheme = useComputedColorScheme("light");

  return (
    <ApiReferenceReact
      configuration={{
        content: document,
        layout: "classic",
        theme: "alternate",
        showSidebar: false,
        hideDarkModeToggle: true,
        hideSearch: true,
        hiddenClients: true,
        showDeveloperTools: "never",
        defaultOpenAllTags: true,
        forceDarkModeState: colorScheme,
        authentication: {
          preferredSecurityScheme: "apikey",
        },
      }}
    />
  );
}
