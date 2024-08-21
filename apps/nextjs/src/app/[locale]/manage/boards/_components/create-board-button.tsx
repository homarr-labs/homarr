"use client";

import { useCallback } from "react";
import { Affix, Button, Menu } from "@mantine/core";
import { IconCategoryPlus, IconChevronDown, IconFileImport } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";
import { AddBoardModal } from "~/components/manage/boards/add-board-modal";
import { ImportBoardModal } from "~/components/manage/boards/import-board-modal";

interface CreateBoardButtonProps {
  boardNames: string[];
}

export const CreateBoardButton = ({ boardNames }: CreateBoardButtonProps) => {
  const t = useI18n();
  const { openModal: openAddModal } = useModalAction(AddBoardModal);
  const { openModal: openImportModal } = useModalAction(ImportBoardModal);

  const { mutateAsync, isPending } = clientApi.board.createBoard.useMutation({
    onSettled: async () => {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  const onCreateClick = useCallback(() => {
    openAddModal({
      onSuccess: async (values) => {
        await mutateAsync({
          name: values.name,
          columnCount: values.columnCount,
          isPublic: values.isPublic,
        });
      },
      boardNames,
    });
  }, [mutateAsync, boardNames, openAddModal]);

  const onImportClick = useCallback(() => {
    openImportModal({ boardNames });
  }, [openImportModal, boardNames]);

  const buttonGroupContent = (
    <>
      <Button leftSection={<IconCategoryPlus size="1rem" />} onClick={onCreateClick} loading={isPending}>
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
            Import file
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
