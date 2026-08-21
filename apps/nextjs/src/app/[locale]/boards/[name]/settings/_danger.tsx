"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { BoardRenameModal } from "~/components/board/modals/board-rename-modal";
import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";

export const DangerZoneSettingsContent = ({ hideVisibility }: { hideVisibility: boolean }) => {
  const board = useRequiredBoard();
  const t = useI18n("board.setting");
  const tCommonAction = useI18n("common.action");
  const router = useRouter();
  const { openConfirmModal } = useConfirmModal();
  const { openModal } = useModalAction(BoardRenameModal);
  const { mutate: changeVisibility, isPending: isChangeVisibilityPending } =
    clientApi.board.changeBoardVisibility.useMutation();
  const { mutate: deleteBoard, isPending: isDeletePending } = clientApi.board.deleteBoard.useMutation();
  const utils = clientApi.useUtils();
  const visibility = board.isPublic ? "public" : "private";

  const onRenameClick = useCallback(
    () =>
      openModal({
        id: board.id,
        previousName: board.name,
        onSuccess: (name) => router.push(`/boards/${name}/settings`),
      }),
    [board.id, board.name, router, openModal],
  );

  const onVisibilityClick = useCallback(() => {
    openConfirmModal({
      title: t(`section.dangerZone.action.visibility.confirm.${visibility}.title`),
      children: t(`section.dangerZone.action.visibility.confirm.${visibility}.description`),
      onConfirm: () => {
        changeVisibility(
          {
            id: board.id,
            visibility: visibility === "public" ? "private" : "public",
          },
          {
            onSettled() {
              void utils.board.getBoardByName.invalidate({ name: board.name });
              void utils.board.getHomeBoard.invalidate();
            },
          },
        );
      },
    });
  }, [
    board.id,
    board.name,
    changeVisibility,
    t,
    utils.board.getBoardByName,
    utils.board.getHomeBoard,
    visibility,
    openConfirmModal,
  ]);

  const onDeleteClick = useCallback(() => {
    openConfirmModal({
      title: t("section.dangerZone.action.delete.confirm.title"),
      children: t("section.dangerZone.action.delete.confirm.description"),
      onConfirm: () => {
        deleteBoard(
          { id: board.id },
          {
            onSettled: () => {
              router.push("/");
            },
          },
        );
      },
    });
  }, [board.id, deleteBoard, router, t, openConfirmModal]);

  return (
    <DangerZoneRoot>
      <DangerZoneItem
        label={t("section.dangerZone.action.rename.label")}
        description={t("section.dangerZone.action.rename.description")}
        action={
          <Button variant="subtle" color="red" onClick={onRenameClick}>
            {t("section.dangerZone.action.rename.button")}
          </Button>
        }
      />
      {!hideVisibility && (
        <DangerZoneItem
          label={t("section.dangerZone.action.visibility.label")}
          description={t(`section.dangerZone.action.visibility.description.${visibility}`)}
          action={
            <Button variant="subtle" color="red" loading={isChangeVisibilityPending} onClick={onVisibilityClick}>
              {t(`section.dangerZone.action.visibility.button.${visibility}`)}
            </Button>
          }
        />
      )}
      <DangerZoneItem
        label={tCommonAction("delete")}
        description={t("section.dangerZone.action.delete.description")}
        action={
          <Button variant="subtle" color="red" loading={isDeletePending} onClick={onDeleteClick}>
            {tCommonAction("delete")}
          </Button>
        }
      />
    </DangerZoneRoot>
  );
};
