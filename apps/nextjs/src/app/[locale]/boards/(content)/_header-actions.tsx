"use client";
import dynamic from "next/dynamic";
import { IconDeviceFloppy, IconPencil, IconPencilOff, IconSettings, IconX } from "@tabler/icons-react";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";
import { useBoardPermissions } from "~/components/board/permissions/client";
import { useOptionalBoardEditing } from "./_editing-provider";
import { HeaderButton } from "~/components/layout/header/button";
import { TourTarget } from "~/components/layout/header/tour-target";
const BoardEditActions = dynamic(() => import("./_edit-actions"), { ssr: false });
export const BoardContentEditAction = () => {
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);

  if (!hasChangeAccess) return null;

  return (
    <>
      {isEditMode && <BoardEditActions />}
      <EditModeMenu />
    </>
  );
};

export const BoardContentSettingsAction = ({ demoReadOnly }: { demoReadOnly: boolean }) => {
  const board = useRequiredBoard();
  const t = useI18n("board");
  const { hasChangeAccess } = useBoardPermissions(board);

  if (!hasChangeAccess || demoReadOnly) return null;

  return (
    <TourTarget id="board-settings">
      <HeaderButton href={`/boards/${board.name}/settings`} aria-label={t("action.settings")}>
        <IconSettings stroke={1.5} />
      </HeaderButton>
    </TourTarget>
  );
};

const EditModeMenu = () => {
  const editing = useOptionalBoardEditing();
  const tBoardSetting = useI18n("board.setting");
  if (!editing) return null;
  const {
    isEditMode,
    toggle,
    prewarmEditor,
    editorLoadState,
    isPending,
    isEnteringEditMode,
    returnToLayoutSettings,
    cancelLayoutEdit,
  } = editing;

  if (returnToLayoutSettings) {
    return (
      <>
        <HeaderButton
          onClick={() => void toggle()}
          loading={isPending}
          aria-label={tBoardSetting("section.layout.edit.save")}
        >
          <IconDeviceFloppy stroke={1.5} />
        </HeaderButton>
        <HeaderButton
          onClick={cancelLayoutEdit}
          disabled={isPending}
          aria-label={tBoardSetting("section.layout.edit.cancel.action")}
        >
          <IconX stroke={1.5} />
        </HeaderButton>
      </>
    );
  }

  return (
    <TourTarget id="board-edit-mode">
      <HeaderButton
        onClick={() => void toggle()}
        onFocus={prewarmEditor}
        onPointerEnter={prewarmEditor}
        loading={isPending || isEnteringEditMode}
        data-testid="board-edit-mode-toggle"
        data-board-editor-preload-state={editorLoadState}
        aria-busy={isPending || isEnteringEditMode}
        aria-label={editing.label}
        aria-pressed={isEditMode}
      >
        {isEditMode ? <IconPencilOff stroke={1.5} /> : <IconPencil stroke={1.5} />}
      </HeaderButton>
    </TourTarget>
  );
};
