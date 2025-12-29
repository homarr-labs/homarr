"use client";

import { useCallback } from "react";
import { Menu } from "@mantine/core";
import {
  IconCopy,
  IconDeviceMobile,
  IconDownload,
  IconHome,
  IconSettings,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { DuplicateBoardModal, ImportBoardJsonModal } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

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
  const { data: session } = useSession();

  const { openConfirmModal } = useConfirmModal();
  const { openModal: openDuplicateModal } = useModalAction(DuplicateBoardModal);
  const { openModal: openImportJsonModal } = useModalAction(ImportBoardJsonModal);

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

  const exportBoardMutation = clientApi.backup.exportBoard.useMutation();

  const handleExportBoard = useCallback(async () => {
    try {
      const result = await exportBoardMutation.mutateAsync({
        boardId: board.id,
        includeIntegrations: false,
      });
      // Create a blob and trigger download
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccessNotification({
        title: t("export.success.title"),
        message: t("export.success.message"),
      });
    } catch {
      showErrorNotification({
        title: t("export.error.title"),
        message: t("export.error.message"),
      });
    }
  }, [board.id, exportBoardMutation, t]);

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

  const handleSetMobileHomeBoard = useCallback(async () => {
    await setMobileHomeBoardMutation.mutateAsync({ id: board.id });
  }, [board.id, setMobileHomeBoardMutation]);

  const handleDuplicateBoard = useCallback(() => {
    openDuplicateModal({
      board: {
        id: board.id,
        name: board.name,
      },
    });
  }, [board.id, board.name, openDuplicateModal]);

  return (
    <Menu.Dropdown>
      <Menu.Item onClick={handleSetHomeBoard} leftSection={<IconHome {...iconProps} />}>
        {t("setHomeBoard.label")}
      </Menu.Item>
      <Menu.Item onClick={handleSetMobileHomeBoard} leftSection={<IconDeviceMobile {...iconProps} />}>
        {t("setMobileHomeBoard.label")}
      </Menu.Item>
      {session?.user.permissions.includes("board-create") && (
        <Menu.Item onClick={handleDuplicateBoard} leftSection={<IconCopy {...iconProps} />}>
          {t("duplicate.label")}
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
        <Menu.Item
          onClick={handleExportBoard}
          leftSection={<IconDownload {...iconProps} />}
          disabled={exportBoardMutation.isPending}
        >
          {t("export.label")}
        </Menu.Item>
      )}
      {session?.user.permissions.includes("board-create") && (
        <Menu.Item onClick={openImportJsonModal} leftSection={<IconUpload {...iconProps} />}>
          {t("importJson.label")}
        </Menu.Item>
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
