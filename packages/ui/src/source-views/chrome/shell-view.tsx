"use client";

import { AppShell } from "@mantine/core";

import type { ShellViewProps } from "./contracts";

export const ShellView = ({
  hasHeader = true,
  hasNavigation = true,
  children,
  collapsed,
  backgroundProps,
  headerHeight,
}: ShellViewProps) => {
  return (
    <AppShell
      {...backgroundProps}
      mih={backgroundProps.bg ? "100dvh" : undefined}
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
      padding="xs"
    >
      {children}
    </AppShell>
  );
};
