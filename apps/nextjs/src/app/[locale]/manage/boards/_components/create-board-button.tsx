"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { Button, IconCategoryPlus } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";
import { AddBoardModal } from "~/components/manage/boards/add-board-modal";

interface CreateBoardButtonProps {
  boardNames: string[];
}

export const CreateBoardButton = ({ boardNames }: CreateBoardButtonProps) => {
  const t = useI18n();
  const { openModal } = useModalAction(AddBoardModal);

  const { mutateAsync, isPending } = clientApi.board.create.useMutation({
    onSettled: async () => {
      await revalidatePathAction("/manage/boards");
    },
  });

  const onClick = useCallback(() => {
    openModal({
      onSuccess: async (values) => {
        await mutateAsync({
          name: values.name,
        });
      },
      boardNames,
    });
  }, [mutateAsync, boardNames, openModal]);

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
