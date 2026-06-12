"use client";

import type { AnyApiReferenceConfiguration } from "@scalar/types/api-reference";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import { useColorMode } from "@docusaurus/theme-common";

import "@scalar/api-reference-react/style.css";

export function ThemedApiReference({ configuration }: { configuration: AnyApiReferenceConfiguration }) {
  const { colorMode } = useColorMode();

  return (
    <ApiReferenceReact
      configuration={{
        ...configuration,
        forceDarkModeState: colorMode === "dark" ? "dark" : "light",
      }}
    />
  );
}
