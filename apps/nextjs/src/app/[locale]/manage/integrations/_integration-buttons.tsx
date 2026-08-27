"use client";

import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

interface DeleteIntegrationActionButtonProps {
  integration: { id: string; name: string };
}

export const DeleteIntegrationActionButton = ({ integration }: DeleteIntegrationActionButtonProps) => {
  const t = useI18n("integration.page.delete");
  const tCommon = useI18n("common");
  const utils = clientApi.useUtils();
  const { mutateAsync, isPending } = clientApi.integration.delete.useMutation();

  const onConfirm = () =>
    mutateAsync(
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

  return (
    <InlineConfirmActionIcon
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      onConfirm={onConfirm}
      loading={isPending}
      variant="subtle"
      color="red"
      size={44}
      aria-label={tCommon("action.deleteNamed", { name: integration.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
};
