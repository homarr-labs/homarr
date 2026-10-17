"use client";

import type { PropsWithChildren } from "react";
import { AppShell, Box } from "@mantine/core";
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
    <>
      {backgroundProps.bg && (
        <Box
          aria-hidden
          pos="fixed"
          inset={0}
          style={{
            backgroundImage: backgroundProps.bg,
            backgroundPosition: backgroundProps.bgp,
            backgroundSize: backgroundProps.bgsz,
            backgroundRepeat: backgroundProps.bgr,
            backgroundAttachment: backgroundProps.bga,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <AppShell
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
        style={{ position: "relative", zIndex: 1 }}
      >
        {children}
      </AppShell>
    </>
  );
};
