"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Center, Loader, Menu, ScrollArea } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconDeviceFloppy,
  IconLayoutBoard,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconReplace,
  IconSettings,
  IconX,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { hotkeys } from "@homarr/definitions";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useBoardPermissions } from "~/components/board/permissions/client";
import { HeaderButton } from "~/components/layout/header/button";
import { TourTarget } from "~/components/layout/header/tour-target";

const loadBoardAddMenu = () => import("./_board-add-menu");
const preloadBoardAddMenu = () => void loadBoardAddMenu().catch(() => undefined);
const BoardAddMenu = dynamic(() => loadBoardAddMenu().then(({ BoardAddMenu: AddMenu }) => AddMenu), {
  loading: () => (
    <HeaderButton loading>
      <IconPlus stroke={1.5} />
    </HeaderButton>
  ),
});

export const BoardContentHeaderActions = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);

  if (!hasChangeAccess) {
    return <SelectBoardsMenu />;
  }

  return (
    <>
      {isEditMode && <BoardAddMenu />}

      <EditModeMenu demoReadOnly={demoReadOnly} />

      {!demoReadOnly && (
        <TourTarget id="board-settings">
          <HeaderButton href={`/boards/${board.name}/settings`}>
            <IconSettings stroke={1.5} />
          </HeaderButton>
        </TourTarget>
      )}

      <SelectBoardsMenu />
    </>
  );
};

const EditModeMenu = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const [isEditMode, { open, close }] = useEditMode();
  const board = useRequiredBoard();
  const utils = clientApi.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openConfirmModal } = useConfirmModal();
  const commonT = useI18n();
  const t = useScopedI18n("board.action.edit");
  const returnToLayoutSettings =
    isEditMode &&
    searchParams.get("edit") === "true" &&
    searchParams.get("layout") !== null &&
    searchParams.get("returnTo") === "settings";
  const { mutate: saveBoard, isPending } = clientApi.board.saveBoard.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("notification.success.title"),
        message: t("notification.success.message"),
      });
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void revalidatePathActionAsync(`/boards/${board.name}`);
      close();
      if (returnToLayoutSettings) router.push(`/boards/${board.name}/settings?tab=layout`);
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

  const cancelLayoutEdit = useCallback(() => {
    openConfirmModal({
      title: commonT("board.setting.section.layout.edit.cancel.title"),
      children: commonT("board.setting.section.layout.edit.cancel.message"),
      confirmProps: { children: commonT("common.action.discard"), color: "red" },
      onConfirm() {
        void (async () => {
          await utils.board.getBoardByName.invalidate({ name: board.name });
          close();
          router.push(`/boards/${board.name}/settings?tab=layout`);
        })();
      },
    });
  }, [board.name, close, commonT, openConfirmModal, router, utils.board.getBoardByName]);

  useHotkeys([[hotkeys.toggleBoardEdit, toggle]]);
  usePreventLeaveWithDirty(isEditMode);

  if (returnToLayoutSettings) {
    return (
      <>
        <HeaderButton
          onClick={() => saveBoard(board)}
          loading={isPending}
          aria-label={commonT("board.setting.section.layout.edit.save")}
        >
          <IconDeviceFloppy stroke={1.5} />
        </HeaderButton>
        <HeaderButton
          onClick={cancelLayoutEdit}
          disabled={isPending}
          aria-label={commonT("board.setting.section.layout.edit.cancel.action")}
        >
          <IconX stroke={1.5} />
        </HeaderButton>
      </>
    );
  }

  return (
    <TourTarget id="board-edit-mode">
      <HeaderButton
        onClick={toggle}
        loading={isPending}
        onFocus={preloadBoardAddMenu}
        onPointerEnter={preloadBoardAddMenu}
      >
        {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
      </HeaderButton>
    </TourTarget>
  );
};

const SelectBoardsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const utils = clientApi.useUtils();
  const { data: boards = [], isPending } = clientApi.board.getAllBoards.useQuery(undefined, { enabled: isOpen });
  const preloadBoards = () => void utils.board.getAllBoards.prefetch();

  return (
    <TourTarget id="board-switcher">
      <Box onFocus={preloadBoards} onPointerEnter={preloadBoards}>
        <Menu position="bottom-end" opened={isOpen} onChange={setIsOpen}>
          <Menu.Target>
            <HeaderButton w="auto" px={4}>
              <IconReplace stroke={1.5} />
            </HeaderButton>
          </Menu.Target>
          <Menu.Dropdown style={{ transform: "translate(-7px, 0)" }}>
            <ScrollArea.Autosize mah={300}>
              {isPending && (
                <Center p="xs">
                  <Loader size="xs" />
                </Center>
              )}
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
    </TourTarget>
  );
};

const anchorSelector = "a[href]:not([target='_blank'])";
const usePreventLeaveWithDirty = (isDirty: boolean) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(anchorSelector) : null;
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

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

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, openConfirmModal, router, t]);
};
