"use client";

import type { PropsWithChildren } from "react";
import { AppShell } from "@mantine/core";
import { useAtomValue } from "jotai";

import { useOptionalBackgroundProps } from "./background";
import { navigationCollapsedAtom } from "./header/burger";
import { webSocketConnectionAtom } from "~/app/[locale]/_client-providers/trpc";

interface ClientShellProps {
  hasHeader?: boolean;
  hasNavigation?: boolean;
}

export const ClientShell = ({
  hasHeader = true,
  hasNavigation = true,
  children,
}: PropsWithChildren<ClientShellProps>) => {
  const collapsed = useAtomValue(navigationCollapsedAtom);
  const backgroundProps = useOptionalBackgroundProps()

  const value = useAtomValue(webSocketConnectionAtom);

  return (
    <AppShell
      {...backgroundProps}
      header={hasHeader ? { height: 60 + (value === 'closed' ? 20 : 0) } : undefined}
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
