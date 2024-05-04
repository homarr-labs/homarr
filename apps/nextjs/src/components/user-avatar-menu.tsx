"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Center,
  Menu,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useTimeout } from "@mantine/hooks";
import {
  IconCheck,
  IconDashboard,
  IconLogin,
  IconLogout,
  IconMoon,
  IconSun,
  IconTool,
} from "@tabler/icons-react";

import { signOut, useSession } from "@homarr/auth/client";
import { createModal, useModalAction } from "@homarr/modals";
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

  const session = useSession();
  const router = useRouter();

  const { openModal } = useModalAction(LogoutModal);

  const handleSignout = useCallback(async () => {
    await signOut({
      redirect: false,
    });
    openModal({
      onTimeout: () => {
        router.refresh();
      },
    });
  }, [openModal, router]);

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
        {session.status === "authenticated" ? (
          <Menu.Item
            onClick={handleSignout}
            leftSection={<IconLogout size="1rem" />}
            color="red"
          >
            {t("logout")}
          </Menu.Item>
        ) : (
          <Menu.Item
            onClick={() => router.push("/auth/login")}
            leftSection={<IconLogin size="1rem" />}
          >
            {t("login")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
      <Menu.Target>{children}</Menu.Target>
    </Menu>
  );
};

const LogoutModal = createModal<{ onTimeout: () => void }>(
  ({ actions, innerProps }) => {
    const t = useScopedI18n("common.userAvatar.menu");
    const { start } = useTimeout(() => {
      actions.closeModal();
      innerProps.onTimeout();
    }, 1500);

    useEffect(() => {
      start();
    }, []);

    return (
      <Center h={200 - 2 * 16}>
        <Stack align="center" c="green">
          <IconCheck size={50} />
          <Text ta="center" fw="bold">
            {t("loggedOut")}
          </Text>
        </Stack>
      </Center>
    );
  },
).withOptions({
  centered: true,
  withCloseButton: false,
  transitionProps: {
    transition: "pop",
  },
  size: 200,
  closeOnClickOutside: false,
  closeOnEscape: false,
});
