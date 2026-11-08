"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { MantineColorSchemeManager } from "@mantine/core";
import { z } from "zod/v4";

import { brandingServerSettingsSchema } from "@homarr/server-settings";
import { customThemeSchema, themeSelectionSchema } from "@homarr/validation/theme";

export const themePreviewMessageSchema = z.strictObject({
  type: z.literal("homarr-theme-preview"),
  branding: brandingServerSettingsSchema,
  themeId: themeSelectionSchema.nullable(),
  customTheme: customThemeSchema.nullable(),
  scheme: z.enum(["light", "dark"]),
  surface: z.enum(["board", "components", "overlays", "typography", "liveBoard"]),
  includeCustomCss: z.boolean(),
});

export type ThemePreviewMessage = z.infer<typeof themePreviewMessageSchema>;
const ThemePreviewContext = createContext<ThemePreviewMessage | null>(null);
export const useThemePreview = () => useContext(ThemePreviewContext);

// Previewing a scheme must never update the account's persisted color scheme.
export const previewColorSchemeManager: MantineColorSchemeManager = {
  get: (fallback) => fallback,
  set: () => undefined,
  subscribe: () => undefined,
  unsubscribe: () => undefined,
  clear: () => undefined,
};

export const ThemePreviewProvider = ({ children }: PropsWithChildren) => {
  const [preview, setPreview] = useState<ThemePreviewMessage | null>(null);

  useEffect(() => {
    if (window.parent === window || new URL(window.location.href).searchParams.get("theme-preview") !== "1") return;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const result = themePreviewMessageSchema.safeParse(event.data);
      if (result.success) setPreview(result.data);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "homarr-theme-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const style = document.querySelector<HTMLStyleElement>("style[data-homarr-global-custom-css]");
    if (style?.sheet) style.sheet.disabled = !preview.includeCustomCss;
    const previousBackground = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = "var(--mantine-color-body)";
    document.body.inert = preview.surface === "liveBoard";
    window.parent.postMessage({ type: "homarr-theme-preview-applied" }, window.location.origin);
    return () => {
      if (style?.sheet) style.sheet.disabled = false;
      document.documentElement.style.backgroundColor = previousBackground;
      document.body.inert = false;
    };
  }, [preview]);

  return <ThemePreviewContext value={preview}>{children}</ThemePreviewContext>;
};
