"use client";

import type { ReactNode } from "react";
import { ActionIcon, Tooltip, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";

import { hotkeys } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { UserAvatarMenu } from "~/components/user-avatar-menu";
import type { BoardSwitcherControls } from "~/components/board/board-switcher";
import { useAvailableUpdates } from "./update";

interface UserButtonClientProps {
  avatar: ReactNode;
  isAdmin: boolean;
  isDockerEnabled: boolean;
  boardSwitcher: BoardSwitcherControls;
}

export const UserButtonClient = ({ avatar, isAdmin, isDockerEnabled, boardSwitcher }: UserButtonClientProps) => {
  const t = useI18n("common.userAvatar.menu");
  const availableUpdates = useAvailableUpdates(isAdmin);
  const { toggleColorScheme } = useMantineColorScheme();
  useHotkeys([[hotkeys.toggleColorScheme, toggleColorScheme]]);

  return (
    <UserAvatarMenu availableUpdates={availableUpdates} isDockerEnabled={isDockerEnabled} boardSwitcher={boardSwitcher}>
      <Tooltip label={t("open")} events={{ hover: true, focus: true, touch: false }}>
        <ActionIcon aria-label={t("open")} variant="subtle" color="gray" size={44} radius="xl">
          {avatar}
        </ActionIcon>
      </Tooltip>
    </UserAvatarMenu>
  );
};
