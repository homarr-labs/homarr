import { DirectionProvider, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import type { MantineColorSchemeManager } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createBrandTheme } from "@homarr/ui/theme";

import { providerOrder } from "../contracts/providers";
import type { ProviderContributions, ProviderProps } from "../contracts/providers";
import type { Bootstrap } from "../contracts/render";

export function ApplicationProviders(
  props: ProviderProps & {
    contributions: ProviderContributions;
    publicSettings: Bootstrap["publicSettings"];
    colorScheme: Bootstrap["colorScheme"];
    colorSchemeManager: MantineColorSchemeManager;
  },
) {
  return providerOrder.reduceRight<ReactNode>((children, slot) => {
    if (slot === "theme")
      return (
        <MantineProvider
          theme={createBrandTheme(props.publicSettings.branding)}
          defaultColorScheme={props.colorScheme}
          colorSchemeManager={props.colorSchemeManager}
          cssVariablesResolver={v8CssVariablesResolver}
        >
          {children}
        </MantineProvider>
      );
    if (slot === "direction")
      return (
        <DirectionProvider initialDirection={props.snapshot.direction} detectDirection={false}>
          {children}
        </DirectionProvider>
      );
    if (slot === "query") return <QueryClientProvider client={props.queryClient}>{children}</QueryClientProvider>;
    const Provider = props.contributions[slot];
    if (!Provider) return children;
    return (
      <Provider snapshot={props.snapshot} queryClient={props.queryClient}>
        {children}
      </Provider>
    );
  }, props.children);
}
