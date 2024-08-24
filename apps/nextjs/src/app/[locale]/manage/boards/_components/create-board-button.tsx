"use client";

import { useCallback } from "react";
import { IconCategoryPlus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";
import { AddBoardModal } from "~/components/manage/boards/add-board-modal";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

interface CreateBoardButtonProps {
  boardNames: string[];
}

export const CreateBoardButton = ({ boardNames }: CreateBoardButtonProps) => {
  const t = useI18n();
  const { openModal } = useModalAction(AddBoardModal);

  const { mutateAsync, isPending } = clientApi.board.createBoard.useMutation({
    onSettled: async () => {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  const onClick = useCallback(() => {
    openModal({
      onSuccess: async (values) => {
        await mutateAsync({
          name: values.name,
          columnCount: values.columnCount,
          isPublic: values.isPublic,
        });
      },
      boardNames,
    });
  }, [mutateAsync, boardNames, openModal]);

  return (
    <MobileAffixButton leftSection={<IconCategoryPlus size="1rem" />} onClick={onClick} loading={isPending}>
      {t("management.page.board.action.new.label")}
    </MobileAffixButton>
  );
};
