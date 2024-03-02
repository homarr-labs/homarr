"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";
import { Button, Divider, Group, Stack, Text } from "@homarr/ui";

import { modalEvents } from "~/app/[locale]/modals";
import { useRequiredBoard } from "../../_context";
import classes from "./danger.module.css";

export const DangerZoneSettingsContent = () => {
  const board = useRequiredBoard();
  const t = useScopedI18n("board.setting");
  const router = useRouter();
  const { mutate: changeVisibility, isPending: isChangeVisibilityPending } =
    clientApi.board.changeVisibility.useMutation();
  const { mutate: deleteBoard, isPending: isDeletePending } =
    clientApi.board.delete.useMutation();
  const utils = clientApi.useUtils();
  const visibility = board.isPublic ? "public" : "private";

  const onRenameClick = useCallback(
    () =>
      modalEvents.openManagedModal({
        modal: "boardRenameModal",
        title: t("section.dangerZone.action.rename.modal.title"),
        innerProps: {
          id: board.id,
          previousName: board.name,
          onSuccess: (name) => {
            router.push(`/boards/${name}/settings`);
          },
        },
      }),
    [board.id, board.name, router, t],
  );

  const onVisibilityClick = useCallback(() => {
    modalEvents.openConfirmModal({
      title: t(
        `section.dangerZone.action.visibility.confirm.${visibility}.title`,
      ),
      children: t(
        `section.dangerZone.action.visibility.confirm.${visibility}.description`,
      ),
      confirmProps: {
        color: "red.9",
      },
      onConfirm: () => {
        changeVisibility(
          {
            id: board.id,
            visibility: visibility === "public" ? "private" : "public",
          },
          {
            onSettled() {
              void utils.board.byName.invalidate({ name: board.name });
              void utils.board.default.invalidate();
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
    utils.board.byName,
    utils.board.default,
    visibility,
  ]);

  const onDeleteClick = useCallback(() => {
    modalEvents.openConfirmModal({
      title: t("section.dangerZone.action.delete.confirm.title"),
      children: t("section.dangerZone.action.delete.confirm.description"),
      confirmProps: {
        color: "red.9",
      },
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
  }, [board.id, deleteBoard, router, t]);

  return (
    <Stack gap="sm">
      <Divider />
      <DangerZoneRow
        label={t("section.dangerZone.action.rename.label")}
        description={t("section.dangerZone.action.rename.description")}
        buttonText={t("section.dangerZone.action.rename.button")}
        onClick={onRenameClick}
      />
      <Divider />
      <DangerZoneRow
        label={t("section.dangerZone.action.visibility.label")}
        description={t(
          `section.dangerZone.action.visibility.description.${visibility}`,
        )}
        buttonText={t(
          `section.dangerZone.action.visibility.button.${visibility}`,
        )}
        onClick={onVisibilityClick}
        isPending={isChangeVisibilityPending}
      />
      <Divider />
      <DangerZoneRow
        label={t("section.dangerZone.action.delete.label")}
        description={t("section.dangerZone.action.delete.description")}
        buttonText={t("section.dangerZone.action.delete.button")}
        onClick={onDeleteClick}
        isPending={isDeletePending}
      />
    </Stack>
  );
};

interface DangerZoneRowProps {
  label: string;
  description: string;
  buttonText: string;
  isPending?: boolean;
  onClick: () => void;
}

const DangerZoneRow = ({
  label,
  description,
  buttonText,
  onClick,
  isPending,
}: DangerZoneRowProps) => {
  return (
    <Group justify="space-between" px="md" className={classes.dangerZoneGroup}>
      <Stack gap={0}>
        <Text fw="bold" size="sm">
          {label}
        </Text>
        <Text size="sm">{description}</Text>
      </Stack>
      <Group justify="end" w={{ base: "100%", xs: "auto" }}>
        <Button
          variant="subtle"
          color="red"
          loading={isPending}
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </Group>
    </Group>
  );
};
