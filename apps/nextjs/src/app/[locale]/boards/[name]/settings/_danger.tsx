"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmButton } from "@homarr/ui";
import { boardRenameSchema } from "@homarr/validation/board";

import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";

export const DangerZoneSettingsContent = ({ hideVisibility }: { hideVisibility: boolean }) => {
  const board = useRequiredBoard();
  const t = useI18n("board.setting");
  const tCommonAction = useI18n("common.action");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameForm = useZodForm(boardRenameSchema.omit({ id: true }), {
    initialValues: {
      name: board.name,
    },
  });
  const { mutate: renameBoard, isPending: isRenamePending } = clientApi.board.renameBoard.useMutation({
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
    },
  });
  const { mutate: changeVisibility, isPending: isChangeVisibilityPending } =
    clientApi.board.changeBoardVisibility.useMutation();
  const { mutate: deleteBoard, isPending: isDeletePending } = clientApi.board.deleteBoard.useMutation();
  const visibility = board.isPublic ? "public" : "private";

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const handleRename = renameForm.onSubmit((values) => {
    renameBoard(
      { id: board.id, name: values.name },
      {
        onSuccess() {
          router.push(`/boards/${values.name}/settings`);
        },
      },
    );
  });

  const cancelRename = () => {
    renameForm.reset();
    setIsRenaming(false);
  };

  const handleVisibilityChange = () => {
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
  };

  const handleDelete = () => {
    deleteBoard(
      { id: board.id },
      {
        onSettled: () => {
          router.push("/");
        },
      },
    );
  };

  return (
    <DangerZoneRoot>
      <DangerZoneItem
        label={t("section.dangerZone.action.rename.label")}
        description={t("section.dangerZone.action.rename.description")}
        action={
          isRenaming ? (
            <Box component="form" onSubmit={handleRename}>
              <Group wrap="wrap" justify="end">
                <TextInput
                  ref={renameInputRef}
                  aria-label={t("section.dangerZone.action.rename.label")}
                  size="sm"
                  {...renameForm.getInputProps("name")}
                />
                <Button variant="default" onClick={cancelRename} disabled={isRenamePending}>
                  {tCommonAction("cancel")}
                </Button>
                <Button type="submit" color="red" loading={isRenamePending}>
                  {tCommonAction("confirm")}
                </Button>
              </Group>
            </Box>
          ) : (
            <Button variant="subtle" color="red" onClick={() => setIsRenaming(true)}>
              {t("section.dangerZone.action.rename.button")}
            </Button>
          )
        }
      />
      {!hideVisibility && (
        <DangerZoneItem
          label={t("section.dangerZone.action.visibility.label")}
          description={t(`section.dangerZone.action.visibility.description.${visibility}`)}
          action={
            <InlineConfirmButton
              variant="subtle"
              color="red"
              loading={isChangeVisibilityPending}
              onConfirm={handleVisibilityChange}
              confirmLabel={tCommonAction("confirm")}
            >
              {t(`section.dangerZone.action.visibility.button.${visibility}`)}
            </InlineConfirmButton>
          }
        />
      )}
      <DangerZoneItem
        label={tCommonAction("delete")}
        description={t("section.dangerZone.action.delete.description")}
        action={
          <InlineConfirmButton
            variant="subtle"
            color="red"
            loading={isDeletePending}
            onConfirm={handleDelete}
            confirmLabel={tCommonAction("confirm")}
          >
            {tCommonAction("delete")}
          </InlineConfirmButton>
        }
      />
    </DangerZoneRoot>
  );
};
