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
import { createThemeVariablesResolver } from "@homarr/ui/themes";
import type { ServerSettings } from "@homarr/server-settings";

import { createBrandTheme } from "~/theme/branding";

export const CustomMantineProvider = ({
  children,
  defaultColorScheme,
  branding,
}: PropsWithChildren<{ defaultColorScheme: MantineColorScheme; branding?: ServerSettings["branding"] }>) => {
  const manager = useColorSchemeManager();
  const settings = useSettings();
  const configuredBranding = branding ?? settings.branding;
  const themeId = settings.themeId ?? configuredBranding.themeId;
  const configuredTheme = useMemo(() => createBrandTheme(configuredBranding, themeId), [configuredBranding, themeId]);
  const resolver = useMemo(
    () =>
      createThemeVariablesResolver(
        themeId,
        configuredBranding.lockPrimaryColor ? configuredBranding.primaryColor : undefined,
      ),
    [themeId, configuredBranding.lockPrimaryColor, configuredBranding.primaryColor],
  );
  return (
    <DirectionProvider>
      <MantineProvider
        defaultColorScheme={defaultColorScheme}
        colorSchemeManager={manager}
        theme={configuredTheme}
        cssVariablesResolver={resolver}
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
