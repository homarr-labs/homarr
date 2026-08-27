"use client";

import { useCallback } from "react";
import { InlineConfirmActionIcon } from "@homarr/ui";
import { IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface AppDeleteButtonProps {
  app: RouterOutputs["app"]["all"][number];
}

export const AppDeleteButton = ({ app }: AppDeleteButtonProps) => {
  const t = useI18n("app.page.delete");
  const tCommon = useI18n("common");
  const { mutate, isPending } = clientApi.app.delete.useMutation();

  const onConfirm = useCallback(() => {
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
  }, [app.id, mutate, t, tCommon]);

  return (
    <InlineConfirmActionIcon
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      onConfirm={onConfirm}
      loading={isPending}
      variant="subtle"
      color="red"
      size={44}
      aria-label={tCommon("action.deleteNamed", { name: app.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
};
