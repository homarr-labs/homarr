"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu, useMantineColorScheme } from "@mantine/core";
import {
  IconDashboard,
  IconLogout,
  IconMoon,
  IconSun,
  IconTool,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

interface UserAvatarMenuProps {
  children: ReactNode;
}

export const UserAvatarMenu = ({ children }: UserAvatarMenuProps) => {
  const t = useScopedI18n("common.userAvatar.menu");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const ColorSchemeIcon = colorScheme === "dark" ? IconSun : IconMoon;

  const colorSchemeText =
    colorScheme === "dark" ? t("switchToLightMode") : t("switchToDarkMode");

  return (
    <Menu width={200} withArrow withinPortal>
      <Menu.Dropdown>
        <Menu.Item
          onClick={toggleColorScheme}
          leftSection={<ColorSchemeIcon size="1rem" />}
        >
          {colorSchemeText}
        </Menu.Item>
        <Menu.Item
          component={Link}
          href="/boards"
          leftSection={<IconDashboard size="1rem" />}
        >
          {t("navigateDefaultBoard")}
        </Menu.Item>
        <Menu.Item
          component={Link}
          href="/manage"
          leftSection={<IconTool size="1rem" />}
        >
          {t("management")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconLogout size="1rem" />} color="red">
          {t("logout")}
        </Menu.Item>
      </Menu.Dropdown>
      <Menu.Target>{children}</Menu.Target>
    </Menu>
  );
};
