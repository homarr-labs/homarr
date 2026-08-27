"use client";

import type { PropsWithChildren } from "react";
import { AppShell } from "@mantine/core";
import { useAtomValue } from "jotai";
import { useSettings } from "@homarr/settings";

import { useOptionalBackgroundProps } from "./background";
import { appShellHeaderHeight } from "./constants";
import { navigationCollapsedAtom } from "./header/burger";

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
  const backgroundProps = useOptionalBackgroundProps();
  const { headerPreferences } = useSettings();
  const headerHeight = headerPreferences.visible ? appShellHeaderHeight : { base: appShellHeaderHeight, sm: 0 };

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
