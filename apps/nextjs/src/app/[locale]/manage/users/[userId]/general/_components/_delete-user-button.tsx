"use client";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { Button } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface DeleteUserButtonProps {
  user: RouterOutputs["user"]["getById"];
}

export const DeleteUserButton = ({ user }: DeleteUserButtonProps) => {
  const t = useI18n();
  const router = useRouter();
  const { mutateAsync: mutateUserDeletionAsync } = clientApi.user.delete.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/users").then(() => router.push("/manage/users"));
    },
  });
  const { openConfirmModal } = useConfirmModal();

  const handleDelete = useCallback(
    () =>
      openConfirmModal({
        title: t("user.action.delete.label"),

        children: t("user.action.delete.confirm", { username: user.name! }),

        async onConfirm() {
          await mutateUserDeletionAsync({
            userId: user.id,
          });
        },
      }),
    [user, mutateUserDeletionAsync, openConfirmModal, t],
  );

  return (
    <Button onClick={handleDelete} variant="subtle" color="red">
      {t("common.action.delete")}
    </Button>
  );
};
