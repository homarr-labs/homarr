"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useAtom } from "jotai";

import { navigationCollapsedAtom } from "./header/burger";

interface ManagementNavigationValue {
  compact: boolean;
  mobile: boolean;
  desktopWidth: number;
  mobileOpened: boolean;
  toggle(): void;
  closeMobile(): void;
}

const ManagementNavigationContext = createContext<ManagementNavigationValue | null>(null);
export const useManagementNavigation = () => useContext(ManagementNavigationContext);

export function ManagementNavigationProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const theme = useMantineTheme();
  const desktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`, true);
  const [mobileCollapsed, setMobileCollapsed] = useAtom(navigationCollapsedAtom);
  const [ordinaryExpanded, setOrdinaryExpanded] = useState(true);
  const [workbenchOverride, setWorkbenchOverride] = useState<{ pathname: string; expanded: boolean } | null>(null);
  const isWorkbench = /\/manage\/custom-widgets\/(?:new|(?:edit|preview)\/[^/]+)\/?$/.test(pathname);
  let expanded = ordinaryExpanded;
  if (isWorkbench) expanded = workbenchOverride?.pathname === pathname && workbenchOverride.expanded;

  const closeMobile = useCallback(() => setMobileCollapsed(true), [setMobileCollapsed]);
  useEffect(closeMobile, [pathname, closeMobile]);
  useEffect(() => {
    if (!isWorkbench) setWorkbenchOverride(null);
  }, [isWorkbench]);
  const toggle = () => {
    if (isWorkbench) setWorkbenchOverride({ pathname, expanded: !expanded });
    else setOrdinaryExpanded((current) => !current);
  };

  return (
    <ManagementNavigationContext.Provider
      value={{
        compact: desktop && !expanded,
        mobile: !desktop,
        desktopWidth: expanded ? 300 : 64,
        mobileOpened: !desktop && !mobileCollapsed,
        toggle,
        closeMobile,
      }}
    >
      {children}
    </ManagementNavigationContext.Provider>
  );
}
