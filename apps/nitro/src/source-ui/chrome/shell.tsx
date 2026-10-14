import { AppShellMain, Burger } from "@mantine/core";

import { ShellView } from "@homarr/ui/source-views/chrome";

import { ConfigurableHeader } from "./configurable-header";
import type { ClientShellProps, SourceChromeProps } from "./contracts";

export function ClientShell({ headerVisible, ...props }: ClientShellProps) {
  let headerHeight = 0;
  if (headerVisible) headerHeight = 60;
  return <ShellView {...props} headerHeight={headerHeight} />;
}

export function SourceChrome({
  collapsed,
  onToggleNavigation,
  backgroundProps,
  header,
  navigation,
  mainId,
  direction,
  sessionBlocked = false,
  children,
}: SourceChromeProps) {
  const hasNavigation = navigation !== undefined && navigation !== null;
  return (
    <ClientShell
      collapsed={collapsed}
      backgroundProps={backgroundProps}
      headerVisible={header.headerPreferences.visible}
      hasNavigation={hasNavigation}
    >
      <div dir={direction} inert={sessionBlocked}>
        <ConfigurableHeader
          {...header}
          userMenu={sessionBlocked ? null : header.userMenu}
          hasNavigation={hasNavigation}
          burger={<Burger opened={!collapsed} onClick={onToggleNavigation} hiddenFrom="sm" size="sm" />}
        />
        {navigation}
      </div>
      <AppShellMain id={mainId} tabIndex={-1} dir={direction}>
        {children}
      </AppShellMain>
    </ClientShell>
  );
}
