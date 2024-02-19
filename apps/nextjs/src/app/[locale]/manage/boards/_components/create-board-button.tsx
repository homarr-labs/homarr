"use client";

import React from "react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Button, IconCategoryPlus } from "@homarr/ui";

import { modalEvents } from "~/app/[locale]/modals";
import { revalidatePathAction } from "~/app/revalidatePathAction";

interface CreateBoardButtonProps {
  boardNames: string[];
}

export const CreateBoardButton = ({ boardNames }: CreateBoardButtonProps) => {
  const t = useI18n();

  const { mutateAsync, isPending } = clientApi.board.create.useMutation({
    onSettled: async () => {
      await revalidatePathAction("/manage/boards");
    },
  });

  const onClick = React.useCallback(() => {
    modalEvents.openManagedModal({
      modal: "addBoardModal",
      title: t("management.page.board.button.create"),
      innerProps: {
        onSuccess: async (values) => {
          await mutateAsync({
            name: values.name,
          });
        },
        boardNames,
      },
    });
  }, [mutateAsync, t, boardNames]);

  return (
    <Button
      leftSection={<IconCategoryPlus size="1rem" />}
      onClick={onClick}
      loading={isPending}
    >
      {t("management.page.board.button.create")}
    </Button>
  );
};
