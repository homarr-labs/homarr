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
  const headerHeight = headerPreferences.visible ? appShellHeaderHeight : 0;

  return (
    <AppShell
      {...backgroundProps}
      // The board canvas sizes itself to its content (AppShell runs in "static" mode so
      // <main> doesn't force a 100dvh minimum - see AppShell.css). Without this, a board
      // background image only covers as much height as the content needs, so collapsing a
      // container short enough leaves flat page background showing below it instead of the
      // background continuing to the bottom of the viewport.
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
      padding="md"
    >
      {children}
    </AppShell>
  );
};
