"use client";

import type { PropsWithChildren } from "react";
import { useId, useMemo, useRef } from "react";
import { MantineProvider, Portal, useComputedColorScheme, useMantineTheme } from "@mantine/core";

/** Scope preview colors and portal variables without changing the user's application theme. */
export function PackagePreviewViewport({
  children,
  colorScheme,
  width,
  height,
  scale,
}: PropsWithChildren<{
  colorScheme: "system" | "light" | "dark";
  width: number;
  height: number;
  scale: number;
}>) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/gu, "");
  const root = useRef<HTMLDivElement>(null);
  const currentScheme = useComputedColorScheme("light");
  const hostTheme = useMantineTheme();
  let scheme = currentScheme;
  if (colorScheme !== "system") scheme = colorScheme;
  const theme = useMemo(
    () => ({
      ...hostTheme,
      components: {
        ...hostTheme.components,
        Portal: Portal.extend({ defaultProps: { target: `#widget-preview-overlays-${id}` } }),
      },
    }),
    [hostTheme, id],
  );
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={scheme}
      cssVariablesSelector={`[data-widget-preview-theme="${id}"]`}
      getRootElement={() => root.current ?? undefined}
      deduplicateCssVariables={false}
      withGlobalClasses={false}
    >
      <div
        ref={root}
        data-widget-preview-theme={id}
        data-mantine-color-scheme={scheme}
        style={{
          width: width * scale,
          height: height * scale,
          background: "var(--mantine-color-body)",
          color: "var(--mantine-color-text)",
        }}
      >
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
      <div id={`widget-preview-overlays-${id}`} data-widget-preview-theme={id} data-mantine-color-scheme={scheme} />
    </MantineProvider>
  );
}
