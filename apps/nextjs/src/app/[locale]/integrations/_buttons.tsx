"use client";

import { useRouter } from "next/navigation";

import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { ActionIcon, IconTrash } from "@homarr/ui";

import { api } from "~/trpc/react";
import { revalidatePathAction } from "../../revalidatePathAction";
import { modalEvents } from "../modals";

interface DeleteIntegrationActionButtonProps {
  count: number;
  integration: { id: string; name: string };
}

export const DeleteIntegrationActionButton = ({
  count,
  integration,
}: DeleteIntegrationActionButtonProps) => {
  const t = useScopedI18n("integration.page.delete");
  const router = useRouter();
  const { mutateAsync, isPending } = api.integration.delete.useMutation();

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      onClick={() => {
        modalEvents.openConfirmModal({
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
                  if (count === 1) {
                    router.replace("/integrations");
                  }
                  void revalidatePathAction("/integrations");
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
      aria-label="Delete integration"
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
