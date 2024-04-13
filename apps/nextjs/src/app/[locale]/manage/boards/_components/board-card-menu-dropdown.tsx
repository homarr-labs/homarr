"use client";

import { useCallback } from "react";
import Link from "next/link";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { IconSettings, IconTrash, Menu } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";
import { useBoardPermissions } from "~/components/board/permissions/client";

const iconProps = {
  size: 16,
  stroke: 1.5,
};

interface BoardCardMenuDropdownProps {
  board: Pick<
    RouterOutputs["board"]["getAll"][number],
    "id" | "name" | "creator" | "permissions"
  >;
}

export const BoardCardMenuDropdown = ({
  board,
}: BoardCardMenuDropdownProps) => {
  const t = useScopedI18n("management.page.board.action");
  const tCommon = useScopedI18n("common");

  const { hasFullAccess, hasChangeAccess } = useBoardPermissions({
    creatorId: board.creator?.id ?? null,
    permissions: board.permissions.map(({ permission }) => permission),
  });

  const { openConfirmModal } = useConfirmModal();

  const { mutateAsync, isPending } = clientApi.board.delete.useMutation({
    onSettled: async () => {
      await revalidatePathAction("/manage/boards");
    },
  });

  const handleDeletion = useCallback(() => {
    openConfirmModal({
      title: t("delete.confirm.title"),
      children: t("delete.confirm.description", {
        name: board.name,
      }),
      onConfirm: async () => {
        await mutateAsync({
          id: board.id,
        });
      },
    });
  }, [board.id, board.name, mutateAsync, openConfirmModal, t]);

  return (
    <Menu.Dropdown>
      {hasChangeAccess && (
        <Menu.Item
          component={Link}
          href={`/boards/${board.name}/settings`}
          leftSection={<IconSettings {...iconProps} />}
        >
          {t("settings.label")}
        </Menu.Item>
      )}
      {hasFullAccess && (
        <>
          <Menu.Divider />
          <Menu.Label c="red.7">
            {tCommon("menu.section.dangerZone.title")}
          </Menu.Label>
          <Menu.Item
            c="red.7"
            leftSection={<IconTrash {...iconProps} />}
            onClick={handleDeletion}
            disabled={isPending}
          >
            {t("delete.label")}
          </Menu.Item>
        </>
      )}
    </Menu.Dropdown>
  );
};
