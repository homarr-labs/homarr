"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Group, Menu } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconLayoutBoard,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconReplace,
  IconResize,
  IconSettings,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useBoardPermissions } from "~/components/board/permissions/client";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { useDynamicSectionActions } from "~/components/board/sections/dynamic/dynamic-actions";
import { HeaderButton } from "~/components/layout/header/button";

export const BoardContentHeaderActions = () => {
  const [isEditMode] = useEditMode();
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

      <SelectBoardsMenu />
    </>
  );
};

const AddMenu = () => {
  const { openModal: openCategoryEditModal } = useModalAction(CategoryEditModal);
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { addCategoryToEnd } = useCategoryActions();
  const { addDynamicSection } = useDynamicSectionActions();
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
        <Menu.Item leftSection={<IconBox size={20} />} onClick={handleSelectItem}>
          {t("item.action.create")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item leftSection={<IconBoxAlignTop size={20} />} onClick={handleAddCategory}>
          {t("section.category.action.create")}
        </Menu.Item>

        <Menu.Item leftSection={<IconResize size={20} />} onClick={addDynamicSection}>
          {t("section.dynamic.action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const EditModeMenu = () => {
  const [isEditMode, { open, close }] = useEditMode();
  const board = useRequiredBoard();
  const utils = clientApi.useUtils();
  const t = useScopedI18n("board.action.edit");
  const { mutate: saveBoard, isPending } = clientApi.board.saveBoard.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("notification.success.title"),
        message: t("notification.success.message"),
      });
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void revalidatePathActionAsync(`/boards/${board.name}`);
      close();
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
    open();
  }, [board, isEditMode, saveBoard, open]);

  useHotkeys([["mod+e", toggle]]);
  usePreventLeaveWithDirty(isEditMode);

  return (
    <HeaderButton onClick={toggle} loading={isPending}>
      {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
    </HeaderButton>
  );
};

const SelectBoardsMenu = () => {
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery();

  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <IconReplace stroke={1.5} />
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-7px, 0)" }}>
        {boards.map((board) => (
          <Menu.Item
            key={board.id}
            component={Link}
            href={`/boards/${board.name}`}
            leftSection={<IconLayoutBoard size={20} />}
          >
            {board.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};

const usePreventLeaveWithDirty = (isDirty: boolean) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event: MouseEvent<HTMLElement>) => {
      const target = (event.target as HTMLElement).closest("a");

      if (!target) return;
      if (!isDirty) return;

      event.preventDefault();

      openConfirmModal({
        title: t("board.action.edit.confirmLeave.title"),
        children: t("board.action.edit.confirmLeave.message"),
        onConfirm() {
          router.push(target.href);
        },
        confirmProps: {
          children: t("common.action.discard"),
        },
      });
    };

    const handlePopState = (event: Event) => {
      if (isDirty) {
        window.history.pushState(null, document.title, window.location.href);
        event.preventDefault();
      } else {
        window.history.back();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      if (env.NODE_ENV === "development") return; // Allow to reload in development

      event.preventDefault();
      event.returnValue = true;
    };

    document.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", handleClick as never);
    });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.querySelectorAll("a").forEach((link) => {
        link.removeEventListener("click", handleClick as never);
        window.removeEventListener("popstate", handlePopState);
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);
};
