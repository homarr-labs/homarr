"use client";

import { useCallback } from "react";
import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface AppDeleteButtonProps {
  app: RouterOutputs["app"]["all"][number];
}

export const AppDeleteButton = ({ app }: AppDeleteButtonProps) => {
  const t = useI18n("app.page.delete");
  const tCommon = useI18n("common");
  const { openConfirmModal } = useConfirmModal();
  const { mutate, isPending } = clientApi.app.delete.useMutation();

  const onClick = useCallback(() => {
    openConfirmModal({
      title: t("title"),
      children: t("message", {
        name: app.name,
      }),
      onConfirm: () => {
        mutate(
          { id: app.id },
          {
            onSuccess: () => {
              showSuccessNotification({
                title: tCommon("notification.delete.success"),
                message: t("notification.success.message"),
              });
              void revalidatePathActionAsync("/manage/apps");
            },
            onError: () => {
              showErrorNotification({
                title: tCommon("notification.delete.error"),
                message: t("notification.error.message"),
              });
            },
          },
        );
      },
    });
  }, [app, mutate, t, tCommon, openConfirmModal]);

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      size={44}
      onClick={onClick}
      aria-label={tCommon("action.deleteNamed", { name: app.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
