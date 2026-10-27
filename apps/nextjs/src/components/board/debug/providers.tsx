"use client";

import type { PropsWithChildren } from "react";
import { MantineProvider } from "@mantine/core";

import { Notifications } from "@homarr/notifications";
import { SpotlightProvider } from "@homarr/spotlight";
import { theme } from "@homarr/ui";

import { JotaiProvider } from "~/app/[locale]/_client-providers/jotai";

// CSS remains owned by the existing locale root. Keep the board renderer out
// of this module so importing these providers cannot hoist board CSS into it.
export const DebugPreviewProviders = ({ children }: PropsWithChildren) => (
  <JotaiProvider>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <SpotlightProvider>
        <Notifications />
        {children}
      </SpotlightProvider>
    </MantineProvider>
  </JotaiProvider>
);
