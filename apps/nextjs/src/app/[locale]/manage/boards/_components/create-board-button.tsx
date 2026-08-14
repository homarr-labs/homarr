"use client";

import { Button } from "@mantine/core";
import { IconCategoryPlus } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { AddBoardModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";

import { ManageMobilePrimaryAction } from "~/components/manage/manage-mobile-primary-action";

export const CreateBoardButton = () => {
  const t = useI18n();
  const { openModal } = useModalAction(AddBoardModal);

  return (
    <ManageMobilePrimaryAction>
      <Button leftSection={<IconCategoryPlus size="1rem" />} onClick={openModal}>
        {t("management.page.board.action.new.label")}
      </Button>
    </ManageMobilePrimaryAction>
  );
};
