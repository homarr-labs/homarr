"use client";

import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface DeleteIntegrationActionButtonProps {
  integration: { id: string; name: string };
}

export const DeleteIntegrationActionButton = ({ integration }: DeleteIntegrationActionButtonProps) => {
  const t = useScopedI18n("integration.page.delete");
  const tList = useScopedI18n("integration.page.list.action");
  const { openConfirmModal } = useConfirmModal();
  const utils = clientApi.useUtils();
  const { mutateAsync, isPending } = clientApi.integration.delete.useMutation();

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      size={44}
      onClick={() => {
        openConfirmModal({
          title: t("title"),
          children: t("message", integration),
          onConfirm: () => {
            void mutateAsync(
              { id: integration.id },
              {
                onSuccess: () => {
                  showSuccessNotification({
                    title: t("notification.success.title"),
                    message: t("notification.success.message"),
                  });
                  void revalidatePathActionAsync("/manage/integrations");
                  void utils.integration.invalidate();
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
      }}
      aria-label={tList("delete", { name: integration.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
