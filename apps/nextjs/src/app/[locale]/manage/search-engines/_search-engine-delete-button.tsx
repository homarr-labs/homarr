"use client";

import { useCallback } from "react";
import { IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

interface SearchEngineDeleteButtonProps {
  searchEngine: RouterOutputs["searchEngine"]["getPaginated"]["items"][number];
}

export const SearchEngineDeleteButton = ({ searchEngine }: SearchEngineDeleteButtonProps) => {
  const t = useI18n("search.engine.page.delete");
  const actionT = useI18n("common.action");
  const { mutate, isPending } = clientApi.searchEngine.delete.useMutation();

  const onConfirm = useCallback(() => {
    mutate(
      { id: searchEngine.id },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: t("notification.success.title"),
            message: t("notification.success.message"),
          });
          void revalidatePathActionAsync("/manage/search-engines");
        },
        onError: () => {
          showErrorNotification({
            title: t("notification.error.title"),
            message: t("notification.error.message"),
          });
        },
      },
    );
  }, [searchEngine.id, mutate, t]);

  return (
    <InlineConfirmActionIcon
      confirmLabel={actionT("confirm")}
      confirmationAriaLabel={actionT("confirm")}
      onConfirm={onConfirm}
      loading={isPending}
      variant="subtle"
      color="red"
      size={44}
      aria-label={actionT("deleteNamed", { name: searchEngine.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
};
