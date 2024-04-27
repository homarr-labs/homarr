"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface DeleteGroupProps {
  group: {
    id: string;
    name: string;
  };
}

export const DeleteGroup = ({ group }: DeleteGroupProps) => {
  const router = useRouter();
  const { mutateAsync } = clientApi.group.deleteGroup.useMutation();
  const { openConfirmModal } = useConfirmModal();
  const tDelete = useScopedI18n("group.action.delete");
  const t = useI18n();

  const handleDeletion = useCallback(() => {
    openConfirmModal({
      title: tDelete("label"),
      children: tDelete("confirm", {
        name: group.name,
      }),
      async onConfirm() {
        await mutateAsync(
          {
            id: group.id,
          },
          {
            onSuccess() {
              void revalidatePathAction("/manage/users/groups");
              router.push("/manage/users/groups");
              showSuccessNotification({
                title: t("common.notification.delete.success"),
                message: tDelete("notification.success.message", {
                  name: group.name,
                }),
              });
            },
            onError() {
              showErrorNotification({
                title: t("common.notification.delete.error"),
                message: tDelete("notification.error.message", {
                  name: group.name,
                }),
              });
            },
          },
        );
      },
    });
  }, [tDelete, t, openConfirmModal, group.id, group.name, mutateAsync, router]);

  return (
    <Button variant="subtle" color="red" onClick={handleDeletion}>
      {tDelete("label")}
    </Button>
  );
};
