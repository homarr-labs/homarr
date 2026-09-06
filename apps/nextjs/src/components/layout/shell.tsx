"use client";

import type { PropsWithChildren } from "react";
import { AppShell } from "@mantine/core";
import { useAtomValue } from "jotai";

import { useOptionalBackgroundProps } from "./background";
import { navigationCollapsedAtom } from "./header/burger";

interface ClientShellProps {
  hasHeader?: boolean;
  hasNavigation?: boolean;
  headerHeight?: number;
}

export const ClientShell = ({
  hasHeader = true,
  hasNavigation = true,
  headerHeight = 60,
  children,
}: PropsWithChildren<ClientShellProps>) => {
  const collapsed = useAtomValue(navigationCollapsedAtom);
  const backgroundProps = useOptionalBackgroundProps();

  return (
    <AppShell
      {...backgroundProps}
      header={hasHeader ? { height: headerHeight } : undefined}
      navbar={
        hasNavigation
          ? {
              width: 300,
              breakpoint: "sm",
              collapsed: { mobile: collapsed },
            }
          : undefined
      }
      padding="md"
    >
      {children}
    </AppShell>
  );
};
