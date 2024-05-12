"use client";

import { useCallback } from "react";
import { Group, Menu } from "@mantine/core";
import {
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconPackageImport,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";

import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";
import { editModeAtom } from "~/components/board/editMode";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useBoardPermissions } from "~/components/board/permissions/client";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "./_context";

export const BoardContentHeaderActions = () => {
  const isEditMode = useAtomValue(editModeAtom);
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);

  if (!hasChangeAccess) {
    return null; // Hide actions for user without access
  }

  return (
    <>
      {isEditMode && <AddMenu />}

      <EditModeMenu />

      <HeaderButton href={`/boards/${board.name}/settings`}>
        <IconSettings stroke={1.5} />
      </HeaderButton>
    </>
  );
};

const AddMenu = () => {
  const { openModal: openCategoryEditModal } =
    useModalAction(CategoryEditModal);
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { addCategoryToEnd } = useCategoryActions();
  const t = useI18n();

  const handleAddCategory = useCallback(
    () =>
      openCategoryEditModal(
        {
          category: {
            id: "new",
            name: "",
          },
          onSuccess({ name }) {
            addCategoryToEnd({ name });
          },
          submitLabel: t("section.category.create.submit"),
        },
        {
          title: (t) => t("section.category.create.title"),
        },
      ),
    [addCategoryToEnd, openCategoryEditModal, t],
  );

  const handleSelectItem = useCallback(() => {
    openItemSelectModal();
  }, [openItemSelectModal]);

  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item
          leftSection={<IconBox size={20} />}
          onClick={handleSelectItem}
        >
          {t("item.action.create")}
        </Menu.Item>
        <Menu.Item leftSection={<IconPackageImport size={20} />}>
          {t("item.action.import")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconBoxAlignTop size={20} />}
          onClick={handleAddCategory}
        >
          {t("section.category.action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const EditModeMenu = () => {
  const [isEditMode, setEditMode] = useAtom(editModeAtom);
  const board = useRequiredBoard();
  const utils = clientApi.useUtils();
  const t = useScopedI18n("board.action.edit");
  const { mutate: saveBoard, isPending } =
    clientApi.board.saveBoard.useMutation({
      onSuccess() {
        showSuccessNotification({
          title: t("notification.success.title"),
          message: t("notification.success.message"),
        });
        void utils.board.getBoardByName.invalidate({ name: board.name });
        void revalidatePathActionAsync(`/boards/${board.name}`);
        setEditMode(false);
      },
      onError() {
        showErrorNotification({
          title: t("notification.error.title"),
          message: t("notification.error.message"),
        });
      },
    });

  const toggle = useCallback(() => {
    if (isEditMode) return saveBoard(board);
    setEditMode(true);
  }, [board, isEditMode, saveBoard, setEditMode]);

  return (
    <HeaderButton onClick={toggle} loading={isPending}>
      {isEditMode ? (
        <IconPencilOff stroke={1.5} />
      ) : (
        <IconPencil stroke={1.5} />
      )}
    </HeaderButton>
  );
};
