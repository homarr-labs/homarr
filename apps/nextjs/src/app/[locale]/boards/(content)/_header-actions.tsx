"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Box, Menu, ScrollArea } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconLayoutBoard, IconPencil, IconPencilOff, IconReplace, IconSettings } from "@tabler/icons-react";

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
import { loadGridEditorAsync, scheduleGridEditorWarmup } from "~/components/board/sections/grid/grid-editor-loader";
import { HeaderButton } from "~/components/layout/header/button";
import type * as EditActionsModule from "./_edit-actions";

let editActionsModulePromise: Promise<typeof EditActionsModule> | undefined;
const loadEditActionsAsync = () => {
  editActionsModulePromise ??= import("./_edit-actions").catch((error: unknown) => {
    editActionsModulePromise = undefined;
    throw error;
  });
  return editActionsModulePromise;
};
const loadBoardEditorAsync = async () =>
  await Promise.all([
    loadGridEditorAsync(),
    loadEditActionsAsync(),
    import("~/components/board/items/item-menu"),
    import("~/components/board/sections/container/container-menu"),
  ]);
const BoardEditActions = dynamic(loadEditActionsAsync, { ssr: false });

export const BoardContentHeaderActions = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const t = useI18n();
  const { hasChangeAccess } = useBoardPermissions(board);

  if (!hasChangeAccess) {
    return <SelectBoardsMenu />;
  }

  return (
    <>
      {isEditMode && <BoardEditActions />}

      <EditModeMenu demoReadOnly={demoReadOnly} />

      {!demoReadOnly && (
        <OnboardingTour.Target id="board-settings">
          <HeaderButton href={`/boards/${board.name}/settings`} aria-label={t("board.action.settings")}>
            <IconSettings stroke={1.5} />
          </HeaderButton>
        </OnboardingTour.Target>
      )}

      <SelectBoardsMenu />
    </>
  );
};

const EditModeMenu = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const [isEditMode, { open, close }] = useEditMode();
  const [editorLoadState, setEditorLoadState] = useState<"scheduled" | "loading" | "ready" | "error">("scheduled");
  const [isEnteringEditMode, setIsEnteringEditMode] = useState(false);
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

  const prepareEditorAsync = useCallback(async () => {
    if (editorLoadState === "ready") return;

    setEditorLoadState("loading");
    try {
      await loadBoardEditorAsync();
      setEditorLoadState("ready");
    } catch {
      setEditorLoadState("error");
      throw new Error("Unable to load the board editor");
    }
  }, [editorLoadState]);

  useEffect(() => {
    return scheduleGridEditorWarmup(async () => {
      setEditorLoadState("loading");
      try {
        await loadBoardEditorAsync();
        setEditorLoadState("ready");
      } catch {
        setEditorLoadState("error");
      }
    });
  }, []);

  const prewarmEditor = useCallback(() => {
    void prepareEditorAsync().catch(() => {
      // A click or hotkey retries and reports the error.
    });
  }, [prepareEditorAsync]);

  const toggle = useCallback(async () => {
    if (isEditMode) {
      if (demoReadOnly) return discardDemoChanges();
      return saveBoard(board);
    }

    setIsEnteringEditMode(true);
    try {
      await prepareEditorAsync();
      startTransition(open);
    } catch {
      showErrorNotification({
        title: t("notification.loadError.title"),
        message: t("notification.loadError.message"),
      });
    } finally {
      setIsEnteringEditMode(false);
    }
  }, [board, demoReadOnly, discardDemoChanges, isEditMode, open, prepareEditorAsync, saveBoard, t]);

  useHotkeys([[hotkeys.toggleBoardEdit, () => void toggle()]]);
  usePreventLeaveWithDirty(isEditMode);

  return (
    <OnboardingTour.Target id="board-edit-mode">
      <HeaderButton
        onClick={() => void toggle()}
        onFocus={prewarmEditor}
        onPointerEnter={prewarmEditor}
        loading={isPending || isEnteringEditMode}
        data-testid="board-edit-mode-toggle"
        data-board-editor-preload-state={editorLoadState}
        aria-busy={isPending || isEnteringEditMode}
        aria-label={isEditMode ? (demoReadOnly ? t("exit") : t("save")) : t("enter")}
        aria-pressed={isEditMode}
      >
        {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
      </HeaderButton>
    </OnboardingTour.Target>
  );
};

const SelectBoardsMenu = () => {
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery();
  const t = useI18n();

  return (
    <OnboardingTour.Target id="board-switcher">
      <Box>
        <Menu position="bottom-end">
          <Menu.Target>
            <HeaderButton w="auto" px={4} aria-label={t("board.action.switch")}>
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
  }, [isDirty, openConfirmModal, router, t]);
};
