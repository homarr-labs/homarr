import Link from "next/link";

import { AppShellHeader, Group, UnstyledButton } from "@homarr/ui";

import { ClientBurger } from "./header/burger";
import { DesktopSearchInput, MobileSearchButton } from "./header/search";
import { ClientSpotlight } from "./header/spotlight";
import { UserButton } from "./header/user";
import { LogoWithTitle } from "./logo";

export const MainHeader = () => {
  return (
    <AppShellHeader>
      <Group h="100%" gap="xl" px="md" justify="apart" wrap="nowrap">
        <Group h="100%" align="center" style={{ flex: 1 }} wrap="nowrap">
          <ClientBurger />
          <UnstyledButton component={Link} href="/">
            <LogoWithTitle size="md" />
          </UnstyledButton>
        </Group>
        <DesktopSearchInput />
        <Group h="100%" align="center" justify="end" style={{ flex: 1 }}>
          <MobileSearchButton />
          <UserButton />
        </Group>
      </Group>
      <ClientSpotlight />
    </AppShellHeader>
  );
};
