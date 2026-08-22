"use client";

import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface DeleteIntegrationActionButtonProps {
  integration: { id: string; name: string };
}

export const DeleteIntegrationActionButton = ({ integration }: DeleteIntegrationActionButtonProps) => {
  const t = useI18n("integration.page.delete");
  const tCommon = useI18n("common");
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
                    title: tCommon("notification.delete.success"),
                    message: t("notification.success.message"),
                  });
                  void revalidatePathActionAsync("/manage/integrations");
                  void utils.integration.invalidate();
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
      }}
      aria-label={tCommon("action.deleteNamed", { name: integration.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
