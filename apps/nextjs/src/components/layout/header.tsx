import type { ReactNode } from "react";
import { AppShellHeader, Group, UnstyledButton } from "@mantine/core";

import { Link } from "@homarr/ui";

import { UniversalCreateHeaderAction, UniversalCreateQueryGate } from "~/components/create/universal-create-trigger";
import { UniversalCreateSpotlightResult } from "~/components/create/universal-create-spotlight";
import { ClientBurger } from "./header/burger";
import { DesktopSearchInput, MobileSearchButton } from "./header/search";
import { TourTarget } from "./header/tour-target";
import { UserButton } from "./header/user";
import { HomarrLogoWithTitle } from "./logo/homarr-logo";
import { LazySpotlight } from "./header/lazy-spotlight";

interface Props {
  logo?: ReactNode;
  actions?: ReactNode;
  hasNavigation?: boolean;
}

export const MainHeader = ({ logo, actions, hasNavigation = true }: Props) => {
  return (
    <AppShellHeader
      maw="100vw"
      zIndex="var(--homarr-z-index-board-header)"
      style={{ overflowX: "hidden" }}
      data-advanced-focus-background
      data-app-shell-header
    >
      <Group h="100%" gap="xl" px="md" justify="apart" wrap="nowrap">
        <Group h="100%" align="center" style={{ flex: 1 }} wrap="nowrap">
          {hasNavigation && <ClientBurger />}
          <UnstyledButton component={Link} href="/">
            {logo ?? <HomarrLogoWithTitle size="md" />}
          </UnstyledButton>
        </Group>
        <TourTarget id="board-search">
          <DesktopSearchInput />
        </TourTarget>
        <Group h="100%" align="center" justify="end" style={{ flex: 1 }} wrap="nowrap">
          {hasNavigation && <UniversalCreateHeaderAction />}
          {actions}
          <MobileSearchButton />
          <TourTarget id="board-user-menu">
            <UserButton />
          </TourTarget>
        </Group>
      </Group>
      <UniversalCreateQueryGate />
      <UniversalCreateSpotlightResult />
      <LazySpotlight />
    </AppShellHeader>
  );
};
