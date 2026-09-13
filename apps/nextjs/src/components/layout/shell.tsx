"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActionIcon, AppShell, AppShellNavbar, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery, useLocalStorage } from "@mantine/hooks";
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { useOptionalBackgroundProps } from "./background";
import { appShellHeaderHeight } from "./constants";
import { navigationCollapsedAtom } from "./header/burger";

interface ClientShellProps {
  hasHeader?: boolean;
  hasNavigation?: boolean;
  management?: boolean;
}

const NavigationContext = createContext({ enabled: false, compact: false, toggle: () => undefined as void });
export const useCompactNavigation = () => useContext(NavigationContext).compact;

export function NavigationPanel({ children }: PropsWithChildren) {
  const { enabled, compact, toggle } = useContext(NavigationContext);
  const t = useI18n("management");
  const label = compact ? t("expandSidebar") : t("collapseSidebar");
  return (
    <AppShellNavbar p={compact ? "xs" : "md"}>
      {enabled && (
        <Group justify={compact ? "center" : "space-between"} mb="sm" visibleFrom="sm">
          {!compact && (
            <Text size="xs" c="dimmed" fw={600}>
              {t("metaTitle")}
            </Text>
          )}
          <Tooltip label={label} position="right">
            <ActionIcon variant="subtle" color="gray" onClick={toggle} aria-label={label}>
              {compact ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      {children}
    </AppShellNavbar>
  );
}

export const ClientShell = ({
  hasHeader = true,
  hasNavigation = true,
  management = false,
  children,
}: PropsWithChildren<ClientShellProps>) => {
  const [collapsed, setCollapsed] = useAtom(navigationCollapsedAtom);
  const pathname = usePathname();
  useEffect(() => {
    if (management) setCollapsed(true);
  }, [management, pathname, setCollapsed]);
  const desktop = useMediaQuery("(min-width: 48em)");
  const [preferredCompact, setPreferredCompact] = useLocalStorage({
    key: "homarr.management-sidebar-compact",
    defaultValue: false,
  });
  const [workbenchOverride, setWorkbenchOverride] = useState<{ path: string; compact: boolean } | null>(null);
  const isWorkbench = /\/manage\/custom-widgets\/packages\/(?!collections(?:\/|$))[^/]+\/?$/u.test(pathname);
  let compact = preferredCompact;
  if (isWorkbench) compact = workbenchOverride?.path === pathname ? workbenchOverride.compact : true;
  compact = management && Boolean(desktop) && compact;
  const toggle = () => {
    if (isWorkbench) setWorkbenchOverride({ path: pathname, compact: !compact });
    else setPreferredCompact(!compact);
  };
  const backgroundProps = useOptionalBackgroundProps();
  const { headerPreferences } = useSettings();
  const headerHeight = headerPreferences.visible ? appShellHeaderHeight : 0;

  return (
    <NavigationContext.Provider value={{ enabled: management, compact, toggle }}>
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
                width: compact ? 64 : 300,
                breakpoint: "sm",
                collapsed: { mobile: collapsed },
              }
            : undefined
        }
        padding="md"
      >
        {children}
      </AppShell>
    </NavigationContext.Provider>
  );
};
