"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Center, Indicator, Kbd, Loader, Menu, Stack, Text, useMantineColorScheme } from "@mantine/core";
import { useHotkeys, useTimeout } from "@mantine/hooks";
import {
  IconBrandDocker,
  IconCheck,
  IconHome,
  IconLogin,
  IconLogout,
  IconSettings,
  IconRobot,
  IconTool,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { signOut, useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useAuthContext } from "~/app/[locale]/_client-providers/session";
import { useOptionalHomarrAssistant } from "./assistant/assistant-context";
import { CurrentColorSchemeCombobox } from "./color-scheme/current-color-scheme-combobox";
import { CurrentLanguageCombobox } from "./language/current-language-combobox";
import { DockerQuickAccessModal } from "./layout/header/docker-quick-access-modal";
import { AvailableUpdatesMenuItem } from "./layout/header/update";

interface UserAvatarMenuProps {
  children: ReactNode;
  availableUpdatesPromise?: Promise<RouterOutputs["updateChecker"]["getAvailableUpdates"]>;
  isDockerEnabled?: boolean;
}

const formatHotkeyLabel = (hotkey: string, modifierLabel: string) =>
  hotkey
    .split("+")
    .map((key) => (key === "mod" ? modifierLabel : `${key.charAt(0).toUpperCase()}${key.slice(1)}`))
    .join(" + ");

export const UserAvatarMenu = ({ children, availableUpdatesPromise, isDockerEnabled }: UserAvatarMenuProps) => {
  const t = useScopedI18n("common.userAvatar.menu");
  const { toggleColorScheme } = useMantineColorScheme();
  useHotkeys([[hotkeys.toggleColorScheme, toggleColorScheme]]);

  const session = useSession();
  const router = useRouter();

  const { logoutUrl } = useAuthContext();
  const { openModal } = useModalAction(LogoutModal);
  const { openModal: openDockerModal } = useModalAction(DockerQuickAccessModal);
  const assistant = useOptionalHomarrAssistant();

  const handleSignout = useCallback(async () => {
    await signOut({
      redirect: false,
    });
    openModal({
      onTimeout: () => {
        if (logoutUrl) {
          window.location.assign(logoutUrl);
          return;
        }
        router.push("/auth/login");
      },
    });
  }, [logoutUrl, openModal, router]);

  return (
    // We use keepMounted so we can add event listeners to prevent navigating away without saving the board
    <Menu width={300} withinPortal keepMounted>
      <Menu.Dropdown>
        <AvailableUpdatesMenuItem availableUpdatesPromise={availableUpdatesPromise} />
        <Menu.Item component={Link} href="/boards" leftSection={<IconHome size="1rem" />}>
          {t("homeBoard")}
        </Menu.Item>
        <Menu.Divider />

        <Menu.Item p={0} closeMenuOnClick={false} component="div">
          <CurrentColorSchemeCombobox />
        </Menu.Item>
        <Menu.Item p={0} closeMenuOnClick={false} component="div">
          <CurrentLanguageCombobox />
        </Menu.Item>
        <Menu.Divider />
        {Boolean(session.data) && (
          <>
            {assistant?.enabled && (
              <Menu.Item
                leftSection={
                  assistant.isRunning ? <Loader type="bars" color="red" size="xs" /> : <IconRobot size="1rem" />
                }
                rightSection={
                  assistant.unreadCount > 0 ? (
                    <Badge size="sm" variant="filled" color="red" circle>
                      {assistant.unreadCount > 99 ? "99+" : assistant.unreadCount}
                    </Badge>
                  ) : assistant.isRunning ? (
                    <Text size="xs" c="dimmed">
                      {t("assistantThinking")}
                    </Text>
                  ) : (
                    <Kbd size="xs">{formatHotkeyLabel(hotkeys.openAssistant, t("modifier"))}</Kbd>
                  )
                }
                onClick={assistant.open}
              >
                {t("assistant")}
              </Menu.Item>
            )}
            <Menu.Item
              component={Link}
              href={`/manage/users/${session.data?.user.id}/general`}
              leftSection={<IconSettings size="1rem" />}
            >
              {t("preferences")}
            </Menu.Item>

            <Menu.Item component={Link} href="/manage" leftSection={<IconTool size="1rem" />}>
              {t("management")}
            </Menu.Item>
            {isDockerEnabled && (
              <Menu.Item leftSection={<IconBrandDocker size="1rem" />} onClick={() => openDockerModal()}>
                {t("docker")}
              </Menu.Item>
            )}
          </>
        )}
        <Menu.Divider />
        {session.status === "authenticated" ? (
          <Menu.Item onClick={handleSignout} leftSection={<IconLogout size="1rem" />} color="red">
            {t("logout")}
          </Menu.Item>
        ) : (
          <Menu.Item component={Link} href="/auth/login" leftSection={<IconLogin size="1rem" />}>
            {t("login")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
      <Menu.Target>
        <Indicator
          inline
          disabled={!assistant?.isRunning && !assistant?.unreadCount}
          color="red"
          size={20}
          offset={4}
          label={
            assistant?.isRunning ? (
              <Loader type="bars" color="white" size={10} />
            ) : assistant?.unreadCount ? (
              assistant.unreadCount > 99 ? (
                "99+"
              ) : (
                assistant.unreadCount
              )
            ) : undefined
          }
        >
          {children}
        </Indicator>
      </Menu.Target>
    </Menu>
  );
};

const LogoutModal = createModal<{ onTimeout: () => void }>(({ actions, innerProps }) => {
  const t = useScopedI18n("common.userAvatar.menu");
  const { start } = useTimeout(() => {
    actions.closeModal();
    innerProps.onTimeout();
  }, 1500);

  useEffect(() => {
    start();
  }, [start]);

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
}).withOptions({
  centered: true,
  withCloseButton: false,
  transitionProps: {
    transition: "pop",
  },
  size: 200,
  closeOnClickOutside: false,
  closeOnEscape: false,
});
