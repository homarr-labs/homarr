"use client";

import { useCallback } from "react";
import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { revalidatePathActionAsync } from "../../../revalidatePathAction";

interface AppDeleteButtonProps {
  app: RouterOutputs["app"]["all"][number];
}

export const AppDeleteButton = ({ app }: AppDeleteButtonProps) => {
  const t = useScopedI18n("app.page.delete");
  const { openConfirmModal } = useConfirmModal();
  const { mutate, isPending } = clientApi.app.delete.useMutation();

  const onClick = useCallback(() => {
    openConfirmModal({
      title: t("title"),
      children: t("message", app),
      onConfirm: () => {
        mutate(
          { id: app.id },
          {
            onSuccess: () => {
              showSuccessNotification({
                title: t("notification.success.title"),
                message: t("notification.success.message"),
              });
              void revalidatePathActionAsync("/manage/apps");
            },
            onError: () => {
              showErrorNotification({
                title: t("notification.error.title"),
                message: t("notification.error.message"),
              });
            },
          },
        );
      },
    });
  }, [app, mutate, t, openConfirmModal]);

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      onClick={onClick}
      aria-label="Delete app"
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
