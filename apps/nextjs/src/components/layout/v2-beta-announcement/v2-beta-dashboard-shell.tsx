"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import { AppShellHeader, AppShellMain } from "@mantine/core";

import { ClientShell } from "../shell";
import { V2BetaAnnouncement } from "./v2-beta-announcement";

interface V2BetaDashboardShellProps {
  dismissalCookieName: string;
  initiallyDismissed: boolean;
  header: ReactNode;
}

export const V2BetaDashboardShell = ({
  dismissalCookieName,
  initiallyDismissed,
  header,
  children,
}: PropsWithChildren<V2BetaDashboardShellProps>) => {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(!initiallyDismissed);
  const headerHeight = isAnnouncementVisible ? 112 : 60;

  return (
    <ClientShell hasNavigation={false} headerHeight={headerHeight}>
      <AppShellHeader maw="100vw" zIndex={201} style={{ overflowX: "hidden" }}>
        {isAnnouncementVisible && (
          <V2BetaAnnouncement
            dismissalCookieName={dismissalCookieName}
            onDismiss={() => setIsAnnouncementVisible(false)}
          />
        )}
        {header}
      </AppShellHeader>
      <AppShellMain>{children}</AppShellMain>
    </ClientShell>
  );
};
