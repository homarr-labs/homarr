"use client";

import { useCallback } from "react";
import { Menu } from "@mantine/core";
import { IconCopy, IconDeviceMobile, IconHome, IconSettings, IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem, Link } from "@homarr/ui";

import { useBoardPermissions } from "~/components/board/permissions/client";

const iconProps = {
  size: 16,
  stroke: 1.5,
};

interface BoardCardMenuDropdownProps {
  board: Pick<
    RouterOutputs["board"]["getManageOverview"][number],
    "id" | "name" | "creator" | "userPermissions" | "groupPermissions" | "isPublic"
  >;
  onDuplicate: () => void;
}

export const BoardCardMenuDropdown = ({ board, onDuplicate }: BoardCardMenuDropdownProps) => {
  const t = useI18n("management.page.board.action");
  const tRoot = useI18n();
  const tCommon = useI18n("common");

  const { hasFullAccess, hasChangeAccess } = useBoardPermissions(board);
  const { data: session } = useSession();

  const setHomeBoardMutation = clientApi.board.setHomeBoard.useMutation({
    onSettled: async () => {
      // Revalidate all as it's part of the user settings, /boards page and board manage page
      await revalidatePathActionAsync("/");
    },
  });
  const setMobileHomeBoardMutation = clientApi.board.setMobileHomeBoard.useMutation({
    onSettled: async () => {
      // Revalidate all as it's part of the user settings, /boards page and board manage page
      await revalidatePathActionAsync("/");
    },
  });
  const deleteBoardMutation = clientApi.board.deleteBoard.useMutation({
    onSettled: async () => {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  const handleDeletion = useCallback(
    () => deleteBoardMutation.mutateAsync({ id: board.id }),
    [board.id, deleteBoardMutation],
  );

  const handleSetHomeBoard = useCallback(async () => {
    await setHomeBoardMutation.mutateAsync({ id: board.id });
  }, [board.id, setHomeBoardMutation]);

  const handleSetMobileHomeBoard = useCallback(async () => {
    await setMobileHomeBoardMutation.mutateAsync({ id: board.id });
  }, [board.id, setMobileHomeBoardMutation]);

  return (
    <Menu.Dropdown>
      <Menu.Item onClick={handleSetHomeBoard} leftSection={<IconHome {...iconProps} />}>
        {t("setHomeBoard.label")}
      </Menu.Item>
      <Menu.Item onClick={handleSetMobileHomeBoard} leftSection={<IconDeviceMobile {...iconProps} />}>
        {t("setMobileHomeBoard.label")}
      </Menu.Item>
      {session?.user.permissions.includes("board-create") && (
        <Menu.Item onClick={onDuplicate} leftSection={<IconCopy {...iconProps} />}>
          {tRoot("board.action.duplicate.title")}
        </Menu.Item>
      )}
      {hasChangeAccess && (
        <>
          <Menu.Divider />
          <Menu.Item
            component={Link}
            href={`/boards/${board.name}/settings`}
            leftSection={<IconSettings {...iconProps} />}
          >
            {t("settings.label")}
          </Menu.Item>
        </>
      )}
      {hasFullAccess && (
        <>
          <Menu.Divider />
          <Menu.Label c="red.7">{tCommon("dangerZone")}</Menu.Label>
          <InlineConfirmMenuItem
            c="red.7"
            leftSection={<IconTrash {...iconProps} />}
            onConfirm={handleDeletion}
            confirmLabel={tCommon("action.confirm")}
            disabled={deleteBoardMutation.isPending}
          >
            {tCommon("action.delete")}
          </InlineConfirmMenuItem>
        </>
      )}
    </Menu.Dropdown>
  );
};
