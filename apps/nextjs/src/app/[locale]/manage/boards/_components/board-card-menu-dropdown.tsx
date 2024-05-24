"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Menu } from "@mantine/core";
import { IconHome, IconSettings, IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";
import { useBoardPermissions } from "~/components/board/permissions/client";

const iconProps = {
  size: 16,
  stroke: 1.5,
};

interface BoardCardMenuDropdownProps {
  board: Pick<
    RouterOutputs["board"]["getAllBoards"][number],
    "id" | "name" | "creator" | "userPermissions" | "groupPermissions" | "isPublic"
  >;
}

export const BoardCardMenuDropdown = ({ board }: BoardCardMenuDropdownProps) => {
  const t = useScopedI18n("management.page.board.action");
  const tCommon = useScopedI18n("common");

  const { hasFullAccess, hasChangeAccess } = useBoardPermissions(board);

  const { openConfirmModal } = useConfirmModal();

  const setHomeBoardMutation = clientApi.board.setHomeBoard.useMutation({
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

  const handleDeletion = useCallback(() => {
    openConfirmModal({
      title: t("delete.confirm.title"),
      children: t("delete.confirm.description", {
        name: board.name,
      }),
      // eslint-disable-next-line no-restricted-syntax
      onConfirm: async () => {
        await deleteBoardMutation.mutateAsync({
          id: board.id,
        });
      },
    });
  }, [board.id, board.name, deleteBoardMutation, openConfirmModal, t]);

  const handleSetHomeBoard = useCallback(async () => {
    await setHomeBoardMutation.mutateAsync({ id: board.id });
  }, [board.id, setHomeBoardMutation]);

  return (
    <Menu.Dropdown>
      <Menu.Item onClick={handleSetHomeBoard} leftSection={<IconHome {...iconProps} />}>
        {t("setHomeBoard.label")}
      </Menu.Item>
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
          <Menu.Item
            c="red.7"
            leftSection={<IconTrash {...iconProps} />}
            onClick={handleDeletion}
            disabled={deleteBoardMutation.isPending}
          >
            {t("delete.label")}
          </Menu.Item>
        </>
      )}
    </Menu.Dropdown>
  );
};
