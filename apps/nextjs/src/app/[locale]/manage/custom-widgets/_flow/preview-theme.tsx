"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Group, MantineProvider, SegmentedControl, useComputedColorScheme, useMantineTheme } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { mirrorPreviewStyles } from "./preview-shadow";

const PreviewScheme = createContext<"light" | "dark">("light");
const PreviewThemeControl = createContext<{ scheme: string; setScheme(value: string): void } | null>(null);
export function WorkbenchPreviewTheme({ children, controls = true }: { children: ReactNode; controls?: boolean }) {
  const inheritedScheme = useComputedColorScheme("light");
  const [scheme, setScheme] = useState("app");
  let colorScheme = inheritedScheme;
  if (scheme === "light" || scheme === "dark") colorScheme = scheme;
  const control = useMemo(() => ({ scheme, setScheme }), [scheme]);
  return (
    <PreviewScheme.Provider value={colorScheme}>
      <PreviewThemeControl.Provider value={control}>
        {controls && (
          <Group justify="end" mb="xs">
            <WorkbenchPreviewThemeControl />
          </Group>
        )}
        {children}
      </PreviewThemeControl.Provider>
    </PreviewScheme.Provider>
  );
}

export function WorkbenchPreviewThemeControl() {
  const t = useI18n("customWidget.flow");
  const control = useContext(PreviewThemeControl);
  if (!control) return null;
  return (
    <SegmentedControl
      size="xs"
      aria-label={t("previewTheme")}
      value={control.scheme}
      onChange={control.setScheme}
      data={[
        { value: "app", label: t("themeApp") },
        { value: "light", label: t("themeLight") },
        { value: "dark", label: t("themeDark") },
      ]}
    />
  );
}

export function WorkbenchPreviewSurface({ children }: { children: ReactNode }) {
  const scheme = useContext(PreviewScheme);
  const inheritedTheme = useMantineTheme();
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const id = `widget-preview-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;
  useEffect(() => {
    if (!host.current) return;
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    container.className = "nokey";
    container.id = id;
    container.style.color = "var(--mantine-color-text)";
    container.style.width = "fit-content";
    container.style.maxWidth = "100%";
    shadow.append(container);
    const cleanup = mirrorPreviewStyles(shadow);
    setRoot(container);
    return () => {
      cleanup();
      container.remove();
    };
  }, [id]);
  const getRootElement = useCallback(() => root ?? undefined, [root]);
  const theme = useMemo(
    () => ({
      ...inheritedTheme,
      components: {
        ...inheritedTheme.components,
        Portal: {
          ...inheritedTheme.components.Portal,
          defaultProps: { ...inheritedTheme.components.Portal?.defaultProps, target: root },
        },
      },
    }),
    [inheritedTheme, root],
  );
  return (
    <div
      ref={host}
      data-preview-surface
      className="nodrag nopan nowheel nokey"
      style={{ maxWidth: "100%", width: "fit-content" }}
    >
      {root &&
        createPortal(
          <MantineProvider
            theme={theme}
            forceColorScheme={scheme}
            getRootElement={getRootElement}
            cssVariablesSelector={`#${id}`}
            withGlobalClasses={false}
          >
            <div data-preview-theme className="nokey" style={{ colorScheme: scheme }}>
              {children}
            </div>
          </MantineProvider>,
          root,
        )}
    </div>
  );
}
