import { DirectionProvider, MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { providerOrder } from "../contracts/providers";
import type { ProviderContributions, ProviderProps } from "../contracts/providers";

export function ApplicationProviders(props: ProviderProps & { contributions: ProviderContributions }) {
  return providerOrder.reduceRight<ReactNode>((children, slot) => {
    if (slot === "theme") return <MantineProvider forceColorScheme={props.snapshot.theme}>{children}</MantineProvider>;
    if (slot === "direction")
      return <DirectionProvider initialDirection={props.snapshot.direction}>{children}</DirectionProvider>;
    if (slot === "query") return <QueryClientProvider client={props.queryClient}>{children}</QueryClientProvider>;
    const Provider = props.contributions[slot];
    return Provider ? (
      <Provider snapshot={props.snapshot} queryClient={props.queryClient}>
        {children}
      </Provider>
    ) : (
      children
    );
  }, props.children);
}
