import type { ReactNode } from "react";
import { AppShellHeader, Group, UnstyledButton } from "@mantine/core";

import { Spotlight } from "@homarr/spotlight";
import { Link } from "@homarr/ui";

import { ClientBurger } from "./header/burger";
import { DesktopSearchInput, MobileSearchButton } from "./header/search";
import { TourTarget } from "./header/tour-target";
import { UserButton } from "./header/user";
import { HomarrLogoWithTitle } from "./logo/homarr-logo";

interface Props {
  logo?: ReactNode;
  actions?: ReactNode;
  hasNavigation?: boolean;
}

export const MainHeader = ({ logo, actions, hasNavigation = true }: Props) => {
  return (
    <AppShellHeader maw="100vw" zIndex={201} style={{ overflowX: "hidden" }}>
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
          {actions}
          <MobileSearchButton />
          <TourTarget id="board-user-menu">
            <UserButton />
          </TourTarget>
        </Group>
      </Group>
      <Spotlight />
    </AppShellHeader>
  );
};
