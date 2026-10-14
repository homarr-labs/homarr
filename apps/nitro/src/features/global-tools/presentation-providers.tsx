import { DirectionProvider, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import type { MantineProviderProps, MantineThemeOverride } from "@mantine/core";

import type { ProviderProps } from "../../contracts/providers";

export interface GlobalToolThemeProviderProps extends ProviderProps {
  readonly theme: MantineThemeOverride;
  readonly cssVariablesSelector: string;
  readonly getRootElement: NonNullable<MantineProviderProps["getRootElement"]>;
  readonly getStyleNonce?: MantineProviderProps["getStyleNonce"];
}

export function GlobalToolThemeProvider({
  children,
  snapshot,
  theme,
  cssVariablesSelector,
  getRootElement,
  getStyleNonce,
}: GlobalToolThemeProviderProps) {
  return (
    <MantineProvider
      forceColorScheme={snapshot.theme}
      theme={theme}
      cssVariablesResolver={v8CssVariablesResolver}
      cssVariablesSelector={cssVariablesSelector}
      getRootElement={getRootElement}
      getStyleNonce={getStyleNonce}
    >
      {children}
    </MantineProvider>
  );
}

export function GlobalToolDirectionProvider({ children, snapshot }: ProviderProps) {
  return (
    <DirectionProvider initialDirection={snapshot.direction} detectDirection={false}>
      {children}
    </DirectionProvider>
  );
}
