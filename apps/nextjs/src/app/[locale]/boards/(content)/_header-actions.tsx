"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Box, Group, Menu, ScrollArea } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconLayoutBoard,
  IconPencil,
  IconPencilOff,
  IconPlug,
  IconPlus,
  IconReplace,
  IconResize,
  IconSettings,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { hotkeys } from "@homarr/definitions";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useItemActions } from "~/components/board/items/item-actions";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useBoardPermissions } from "~/components/board/permissions/client";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { useDynamicSectionActions } from "~/components/board/sections/dynamic/dynamic-actions";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { HeaderButton } from "~/components/layout/header/button";

export const BoardContentHeaderActions = () => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  // Fall back to read-only if the query has no data (e.g. errored) so we never expose
  // edit/save/settings UI that would then fail server-side.
  const { data: demoReadOnly = true, isLoading } = clientApi.info.isDemoReadOnly.useQuery();

  if (!hasChangeAccess || isLoading) {
    return <SelectBoardsMenu />;
  }

  return (
    <>
      {isEditMode && <AddMenu />}

      <EditModeMenu demoReadOnly={demoReadOnly} />

      {!demoReadOnly && (
        <OnboardingTour.Target id="board-settings">
          <HeaderButton href={`/boards/${board.name}/settings`}>
            <IconSettings stroke={1.5} />
          </HeaderButton>
        </OnboardingTour.Target>
      )}

      <SelectBoardsMenu />
    </>
  );
};

const AddMenu = () => {
  const { data: session } = useSession();
  const { openModal: openCategoryEditModal } = useModalAction(CategoryEditModal);
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { openModal: openAppSelectModal } = useModalAction(AppSelectModal);
  const { openModal: openIntegrationSelectModal } = useModalAction(IntegrationSelectModal);
  const { addCategoryToEnd } = useCategoryActions();
  const { addDynamicSection } = useDynamicSectionActions();
  const { createItem } = useItemActions();
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

  const handleSelectApp = useCallback(() => {
    openAppSelectModal({
      onSelect: (app) => {
        createItem({
          kind: "app",
          options: { appId: app.id },
        });
      },
      withCreate: session?.user.permissions.includes("app-create") ?? false,
    });
  }, [openAppSelectModal, createItem]);

  const handleAddIntegration = useCallback(() => {
    openIntegrationSelectModal({});
  }, [openIntegrationSelectModal]);

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item leftSection={<IconResize size={20} />} onClick={handleSelectItem}>
          {t("item.action.create")}
        </Menu.Item>

        <Menu.Item leftSection={<IconBox size={20} />} onClick={handleSelectApp}>
          {t("app.action.add")}
        </Menu.Item>

        <Menu.Item leftSection={<IconPlug size={20} />} onClick={handleAddIntegration}>
          {t("integration.action.create")}
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

const EditModeMenu = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
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

  const discardDemoChanges = useCallback(() => {
    void utils.board.getBoardByName.invalidate({ name: board.name });
    close();
  }, [utils, board.name, close]);

  const toggle = useCallback(() => {
    if (isEditMode) {
      if (demoReadOnly) return discardDemoChanges();
      return saveBoard(board);
    }
    open();
  }, [board, isEditMode, demoReadOnly, saveBoard, open, discardDemoChanges]);

  useHotkeys([[hotkeys.toggleBoardEdit, toggle]]);
  usePreventLeaveWithDirty(isEditMode);

  return (
    <OnboardingTour.Target id="board-edit-mode">
      <HeaderButton onClick={toggle} loading={isPending}>
        {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
      </HeaderButton>
    </OnboardingTour.Target>
  );
};

const SelectBoardsMenu = () => {
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery();

  return (
    <OnboardingTour.Target id="board-switcher">
      <Box>
        <Menu position="bottom-end">
          <Menu.Target>
            <HeaderButton w="auto" px={4}>
              <IconReplace stroke={1.5} />
            </HeaderButton>
          </Menu.Target>
          <Menu.Dropdown style={{ transform: "translate(-7px, 0)" }}>
            <ScrollArea.Autosize mah={300}>
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
            </ScrollArea.Autosize>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </OnboardingTour.Target>
  );
};

const anchorSelector = "a[href]:not([target='_blank'])";
const usePreventLeaveWithDirty = (isDirty: boolean) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (event: Event) => {
      const target = (event.target as HTMLElement).closest("a");

      if (!target) {
        console.warn("No anchor element found for click event", event);
        return;
      }

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
      window.history.pushState(null, document.title, window.location.href);
      event.preventDefault();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return;

      event.preventDefault();
      event.returnValue = true;
    };

    const anchors = document.querySelectorAll(anchorSelector);
    anchors.forEach((link) => {
      link.addEventListener("click", handleClick);
    });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      anchors.forEach((link) => {
        link.removeEventListener("click", handleClick);
      });
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
};
