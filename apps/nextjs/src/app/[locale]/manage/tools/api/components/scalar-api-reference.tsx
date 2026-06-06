"use client";

import { useComputedColorScheme } from "@mantine/core";
import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";

const customCss = `
  .light-mode {
    --scalar-background-1: var(--mantine-color-body);
    --scalar-background-2: var(--mantine-color-gray-0);
    --scalar-background-3: var(--mantine-color-gray-1);
    --scalar-color-1: var(--mantine-color-text);
    --scalar-color-2: var(--mantine-color-dimmed);
    --scalar-color-3: var(--mantine-color-dimmed);
    --scalar-color-accent: var(--mantine-color-red-6);
    --scalar-border-color: var(--mantine-color-gray-3);
  }
  .dark-mode {
    --scalar-background-1: var(--mantine-color-body);
    --scalar-background-2: var(--mantine-color-dark-6);
    --scalar-background-3: var(--mantine-color-dark-5);
    --scalar-color-1: var(--mantine-color-text);
    --scalar-color-2: var(--mantine-color-dimmed);
    --scalar-color-3: var(--mantine-color-dimmed);
    --scalar-color-accent: var(--mantine-color-red-6);
    --scalar-border-color: var(--mantine-color-dark-4);
  }
`;

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
        customCss,
        authentication: {
          preferredSecurityScheme: "apikey",
        },
      }}
    />
  );
}
