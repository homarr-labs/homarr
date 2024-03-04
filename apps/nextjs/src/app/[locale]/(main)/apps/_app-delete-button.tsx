"use client";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { ActionIcon, IconTrash } from "@homarr/ui";

import { revalidatePathAction } from "../../../revalidatePathAction";
import { modalEvents } from "../../modals";

interface AppDeleteButtonProps {
  app: RouterOutputs["app"]["all"][number];
}

export const AppDeleteButton = ({ app }: AppDeleteButtonProps) => {
  const t = useScopedI18n("app.page.delete");
  const { mutate, isPending } = clientApi.app.delete.useMutation();

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      onClick={() => {
        modalEvents.openConfirmModal({
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
                  void revalidatePathAction("/apps");
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
      aria-label="Delete app"
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
