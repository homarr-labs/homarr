"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatches } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmButton } from "@homarr/ui";

interface DeleteGroupProps {
  group: {
    id: string;
    name: string;
  };
}

export const DeleteGroup = ({ group }: DeleteGroupProps) => {
  const router = useRouter();
  const { mutateAsync } = clientApi.group.deleteGroup.useMutation();
  const tDelete = useI18n("group.action.delete");
  const tCommon = useI18n("common");

  const handleDeletion = useCallback(
    () =>
      mutateAsync(
        {
          id: group.id,
        },
        {
          onSuccess() {
            void revalidatePathActionAsync("/manage/users/groups");
            router.push("/manage/users/groups");
            showSuccessNotification({
              title: tCommon("notification.delete.success"),
              message: tDelete("notification.success.message", {
                name: group.name,
              }),
            });
          },
          onError() {
            showErrorNotification({
              title: tCommon("notification.delete.error"),
              message: tDelete("notification.error.message", {
                name: group.name,
              }),
            });
          },
        },
      ),
    [tDelete, tCommon, group.id, group.name, mutateAsync, router],
  );

  const fullWidth = useMatches({
    xs: true,
    sm: true,
    md: false,
  });

  return (
    <InlineConfirmButton
      variant="subtle"
      color="red"
      onConfirm={handleDeletion}
      confirmLabel={tCommon("action.confirm")}
      fullWidth={fullWidth}
    >
      {tDelete("label")}
    </InlineConfirmButton>
  );
};
