import type { ReactNode } from "react";
import Link from "next/link";

import { AppShellHeader, Group, UnstyledButton } from "@homarr/ui";

import { ClientBurger } from "./header/burger";
import { DesktopSearchInput, MobileSearchButton } from "./header/search";
import { ClientSpotlight } from "./header/spotlight";
import { UserButton } from "./header/user";
import { HomarrLogoWithTitle } from "./logo/homarr-logo";

interface Props {
  logo?: ReactNode;
  actions?: ReactNode;
  hasNavigation?: boolean;
}

export const MainHeader = ({ logo, actions, hasNavigation = true }: Props) => {
  return (
    <AppShellHeader>
      <Group h="100%" gap="xl" px="md" justify="apart" wrap="nowrap">
        <Group h="100%" align="center" style={{ flex: 1 }} wrap="nowrap">
          {hasNavigation && <ClientBurger />}
          <UnstyledButton component={Link} href="/">
            {logo ?? <HomarrLogoWithTitle size="md" />}
          </UnstyledButton>
        </Group>
        <DesktopSearchInput />
        <Group
          h="100%"
          align="center"
          justify="end"
          style={{ flex: 1 }}
          wrap="nowrap"
        >
          {actions}
          <MobileSearchButton />
          <UserButton />
        </Group>
      </Group>
      <ClientSpotlight />
    </AppShellHeader>
  );
};
