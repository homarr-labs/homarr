"use client";

import type { PropsWithChildren } from "react";
import type { MantineColorScheme, MantineColorSchemeManager } from "@mantine/core";
import { createTheme, DirectionProvider, MantineProvider } from "@mantine/core";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { parseCookies, setClientCookie } from "@homarr/common";

export const CustomMantineProvider = ({ children }: PropsWithChildren) => {
  const manager = useColorSchemeManager();

  return (
    <DirectionProvider>
      <MantineProvider
        defaultColorScheme="dark"
        colorSchemeManager={manager}
        theme={createTheme({
          primaryColor: "red",
          autoContrast: true,
        })}
      >
        {children}
      </MantineProvider>
    </DirectionProvider>
  );
};

function useColorSchemeManager(): MantineColorSchemeManager {
  const key = "homarr-color-scheme";
  const { data: session } = useSession();

  const updateCookieValue = (value: Exclude<MantineColorScheme, "auto">) => {
    setClientCookie(key, value, { expires: dayjs().add(1, "year").toDate(), path: "/" });
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
        return (cookies[key] as MantineColorScheme | undefined) ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set: (value) => {
      if (value === "auto") return;
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
