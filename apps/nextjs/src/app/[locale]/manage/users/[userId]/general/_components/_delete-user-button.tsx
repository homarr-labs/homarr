"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmButton } from "@homarr/ui";

interface DeleteUserButtonProps {
  user: RouterOutputs["user"]["getById"];
}

export const DeleteUserButton = ({ user }: DeleteUserButtonProps) => {
  const tCommon = useI18n("common");
  const router = useRouter();
  const { mutateAsync: mutateUserDeletionAsync } = clientApi.user.delete.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/users").then(() => router.push("/manage/users"));
    },
  });
  const handleDelete = useCallback(
    () => mutateUserDeletionAsync({ userId: user.id }),
    [mutateUserDeletionAsync, user.id],
  );

  return (
    <InlineConfirmButton onConfirm={handleDelete} confirmLabel={tCommon("action.confirm")} variant="subtle" color="red">
      {tCommon("action.delete")}
    </InlineConfirmButton>
  );
};
