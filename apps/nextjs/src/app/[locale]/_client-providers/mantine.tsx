"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import type { MantineColorScheme, MantineColorSchemeManager } from "@mantine/core";
import { DirectionProvider, MantineProvider } from "@mantine/core";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { parseCookies, setClientCookie } from "@homarr/common";
import { colorSchemeCookieKey } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import type { ServerSettings } from "@homarr/server-settings";

import { createAppearanceTheme } from "~/theme/branding";
import { previewColorSchemeManager, useThemePreview } from "~/components/theme/theme-preview-context";

export const CustomMantineProvider = ({
  children,
  defaultColorScheme,
  branding,
}: PropsWithChildren<{ defaultColorScheme: MantineColorScheme; branding?: ServerSettings["branding"] }>) => {
  const manager = useColorSchemeManager();
  const settings = useSettings();
  const preview = useThemePreview();
  const configuredBranding = preview?.branding ?? branding ?? settings.branding;
  const { theme, cssVariablesResolver } = useMemo(
    () => createAppearanceTheme(configuredBranding, preview ?? undefined),
    [configuredBranding, preview],
  );
  return (
    <DirectionProvider>
      <MantineProvider
        defaultColorScheme={defaultColorScheme}
        colorSchemeManager={preview ? previewColorSchemeManager : manager}
        forceColorScheme={preview?.scheme}
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
      >
        {children}
      </MantineProvider>
    </DirectionProvider>
  );
};

export function useColorSchemeManager(): MantineColorSchemeManager {
  const { data: session } = useSession();

  const updateCookieValue = (value: MantineColorScheme) => {
    setClientCookie(colorSchemeCookieKey, value, { expires: dayjs().add(1, "year").toDate(), path: "/" });
  };

  const { mutate: mutateColorScheme } = clientApi.user.changeColorScheme.useMutation({
    onSuccess: (_, variables) => {
      updateCookieValue(variables.colorScheme);
    },
  });

  return {
    get: (defaultValue) => {
      if (typeof window === "undefined") {
        return defaultValue;
      }

      try {
        const cookies = parseCookies(document.cookie);
        return (cookies[colorSchemeCookieKey] as MantineColorScheme | undefined) ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set: (value) => {
      try {
        if (session) {
          mutateColorScheme({ colorScheme: value });
        }
        updateCookieValue(value);
      } catch (error) {
        console.warn("[@mantine/core] Color scheme manager was unable to save color scheme.", error);
      }
    },
    subscribe: () => undefined,
    unsubscribe: () => undefined,
    clear: () => undefined,
  };
}
