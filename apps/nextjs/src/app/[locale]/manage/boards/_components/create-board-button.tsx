"use client";

import { useCallback } from "react";
import { Affix, Button, Group, Menu } from "@mantine/core";
import { IconCategoryPlus, IconChevronDown, IconFileImport } from "@tabler/icons-react";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { AddBoardModal, ImportBoardModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";
import { BetaBadge } from "@homarr/ui";

interface CreateBoardButtonProps {
  boardNames: string[];
}

export const CreateBoardButton = ({ boardNames }: CreateBoardButtonProps) => {
  const t = useI18n();
  const { openModal: openAddModal } = useModalAction(AddBoardModal);
  const { openModal: openImportModal } = useModalAction(ImportBoardModal);

  const onCreateClick = useCallback(() => {
    openAddModal({
      onSettled: async () => {
        await revalidatePathActionAsync("/manage/boards");
      },
    });
  }, [openAddModal]);

  const onImportClick = useCallback(() => {
    openImportModal({ boardNames });
  }, [openImportModal, boardNames]);

  const buttonGroupContent = (
    <>
      <Button leftSection={<IconCategoryPlus size="1rem" />} onClick={onCreateClick}>
        {t("management.page.board.action.new.label")}
      </Button>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button px="xs" ms={1}>
            <IconChevronDown size="1rem" />
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={onImportClick} leftSection={<IconFileImport size="1rem" />}>
            <Group>
              {t("board.action.oldImport.label")}
              <BetaBadge size="xs" />
            </Group>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );

  return (
    <>
      <Button.Group visibleFrom="md">{buttonGroupContent}</Button.Group>
      <Affix hiddenFrom="md" position={{ bottom: 20, right: 20 }}>
        <Button.Group>{buttonGroupContent}</Button.Group>
      </Affix>
    </>
  );
};
