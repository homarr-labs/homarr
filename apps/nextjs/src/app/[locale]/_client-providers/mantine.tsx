"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import type { MantineColorScheme, MantineColorSchemeManager } from "@mantine/core";
import { createTheme, DirectionProvider, isMantineColorScheme, MantineProvider } from "@mantine/core";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { parseCookies, setClientCookie } from "@homarr/common";

export const CustomMantineProvider = ({ children }: PropsWithChildren) => {
  const manager = useColorSchemeManager();

  return (
    <DirectionProvider>
      <MantineProvider
        defaultColorScheme="auto"
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
  const [sessionColorScheme, setSessionColorScheme] = useState<MantineColorScheme | undefined>(
    session?.user.colorScheme,
  );
  const { mutate: mutateColorScheme } = clientApi.user.changeColorScheme.useMutation({
    onSuccess: (_, variables) => {
      setSessionColorScheme(variables.colorScheme);
    },
  });

  let handleStorageEvent: (event: StorageEvent) => void;

  return {
    get: (defaultValue) => {
      if (typeof window === "undefined") {
        return defaultValue;
      }

      if (sessionColorScheme) {
        return sessionColorScheme;
      }

      try {
        const cookies = parseCookies(document.cookie);
        return (cookies[key] as MantineColorScheme | undefined) ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set: (value) => {
      try {
        if (session) {
          mutateColorScheme({ colorScheme: value });
        }
        setClientCookie(key, value, { expires: dayjs().add(1, "year").toDate() });
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn("[@mantine/core] Local storage color scheme manager was unable to save color scheme.", error);
      }
    },

    subscribe: (onUpdate) => {
      handleStorageEvent = (event) => {
        if (session) return; // Ignore updates when session is available as we are using session color scheme
        if (event.storageArea === window.localStorage && event.key === key && isMantineColorScheme(event.newValue)) {
          onUpdate(event.newValue);
        }
      };

      window.addEventListener("storage", handleStorageEvent);
    },

    unsubscribe: () => {
      window.removeEventListener("storage", handleStorageEvent);
    },

    clear: () => {
      window.localStorage.removeItem(key);
    },
  };
}
