"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { Badge, Indicator, Kbd, Loader, Menu, Text } from "@mantine/core";
import {
  IconBrandDocker,
  IconHome,
  IconLayoutDashboard,
  IconLogin,
  IconLogout,
  IconReplace,
  IconSettings,
  IconRobot,
  IconTool,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { signOut, useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { hotkeys, invariantTechnicalLabels } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useAuthContext } from "~/app/[locale]/_client-providers/session";
import { useOptionalHomarrAssistant } from "./assistant/assistant-context";
import type { BoardSwitcherControls } from "./board/board-switcher";
import { CurrentColorSchemeCombobox } from "./color-scheme/current-color-scheme-combobox";
import { CurrentLanguageCombobox } from "./language/current-language-combobox";
import { DockerQuickAccessModal } from "./layout/header/docker-quick-access-modal";
import { AvailableUpdatesMenuItem } from "./layout/header/update";

interface UserAvatarMenuProps {
  children: ReactNode;
  availableUpdates?: RouterOutputs["updateChecker"]["getAvailableUpdates"];
  isDockerEnabled?: boolean;
  boardSwitcher: BoardSwitcherControls;
}

const formatHotkeyLabel = (hotkey: string, modifierLabel: string) =>
  hotkey
    .split("+")
    .map((key) => (key === "mod" ? modifierLabel : `${key.charAt(0).toUpperCase()}${key.slice(1)}`))
    .join(" + ");

export const UserAvatarMenu = ({ children, availableUpdates, isDockerEnabled, boardSwitcher }: UserAvatarMenuProps) => {
  const t = useI18n("common.userAvatar.menu");
  const tBoard = useI18n("board");
  const session = useSession();
  const board = useOptionalBoard();
  const boardPermissions = board && constructBoardPermissions(board, session.data ?? null);

  const { logoutUrl } = useAuthContext();
  const { openModal: openDockerModal } = useModalAction(DockerQuickAccessModal);
  const assistant = useOptionalHomarrAssistant();

  const handleSignout = useCallback(async () => {
    const redirectUrl = logoutUrl ?? "/auth/login";
    await signOut({
      redirect: false,
    });
    window.location.assign(redirectUrl);
  }, [logoutUrl]);

  return (
    // We use keepMounted so we can add event listeners to prevent navigating away without saving the board
    <Menu width={300} withinPortal keepMounted>
      <Menu.Dropdown>
        <AvailableUpdatesMenuItem availableUpdates={availableUpdates} />
        <Menu.Item component={Link} href="/boards" leftSection={<IconHome size="1rem" />}>
          {t("homeBoard")}
        </Menu.Item>
        {board && boardPermissions?.hasChangeAccess && (
          <Menu.Item
            component={Link}
            href={`/boards/${encodeURIComponent(board.name)}/settings`}
            leftSection={<IconLayoutDashboard size="1rem" />}
          >
            {tBoard("action.settings")}
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconReplace size="1rem" />}
          rightSection={<Kbd size="xs">{formatHotkeyLabel(boardSwitcher.hotkey, t("modifier"))}</Kbd>}
          onClick={boardSwitcher.open}
          onFocus={boardSwitcher.preload}
          onPointerEnter={boardSwitcher.preload}
        >
          {tBoard("action.switch")}
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
                {invariantTechnicalLabels.docker}
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
