"use client";

import dynamic from "next/dynamic";
import { useComputedColorScheme } from "@mantine/core";

import "@scalar/api-reference-react/style.css";
import "./scalar-theme.css";

// The API reference is a whole documentation SPA reachable only from this one admin
// tab, and it renders nothing useful on the server. Loading it lazily keeps it out
// of the server graph instead of compiling it for an SSR pass that is discarded.
const ApiReferenceReact = dynamic(() => import("@scalar/api-reference-react").then((mod) => mod.ApiReferenceReact), {
  ssr: false,
});

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
