import type { ReactNode } from "react";
import { AppShellHeader, Group, UnstyledButton } from "@mantine/core";

import { Spotlight } from "@homarr/spotlight";
import { Link } from "@homarr/ui";

import { ClientBurger } from "./header/burger";
import { DesktopSearchInput, MobileSearchButton } from "./header/search";
import { ResponsiveUserButton } from "./header/responsive-user";
import { TourTarget } from "./header/tour-target";
import { UserButton } from "./header/user";
import { HomarrLogoWithTitle } from "./logo/homarr-logo";

interface Props {
  logo?: ReactNode;
  logoHref?: string | null;
  actions?: ReactNode;
  hasNavigation?: boolean;
  withSafeArea?: boolean;
  hideUserOnMobileBoard?: boolean;
}

export const MainHeader = ({
  logo,
  logoHref = "/",
  actions,
  hasNavigation = true,
  withSafeArea = false,
  hideUserOnMobileBoard = false,
}: Props) => {
  return (
    <AppShellHeader
      maw="100vw"
      zIndex={201}
      style={{
        overflowX: "hidden",
        paddingTop: withSafeArea ? "env(safe-area-inset-top)" : undefined,
        paddingRight: withSafeArea ? "env(safe-area-inset-right)" : undefined,
        paddingLeft: withSafeArea ? "env(safe-area-inset-left)" : undefined,
      }}
    >
      <Group h="100%" gap="md" px="md" justify="apart" wrap="nowrap">
        <Group h="100%" align="center" style={{ flex: 1 }} wrap="nowrap">
          {hasNavigation && <ClientBurger />}
          {logoHref === null ? (
            (logo ?? <HomarrLogoWithTitle size="md" />)
          ) : (
            <UnstyledButton component={Link} href={logoHref}>
              {logo ?? <HomarrLogoWithTitle size="md" />}
            </UnstyledButton>
          )}
        </Group>
        <TourTarget id="board-search">
          <DesktopSearchInput />
        </TourTarget>
        <Group h="100%" align="center" justify="end" style={{ flex: 1 }} wrap="nowrap">
          {actions}
          <MobileSearchButton />
          <ResponsiveUserButton hideOnMobileBoard={hideUserOnMobileBoard}>
            <TourTarget id="board-user-menu">
              <UserButton />
            </TourTarget>
          </ResponsiveUserButton>
        </Group>
      </Group>
      <Spotlight />
    </AppShellHeader>
  );
};
