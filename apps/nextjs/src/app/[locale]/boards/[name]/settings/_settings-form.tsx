"use client";

import { useEffect, useRef } from "react";
import { Button, Stack } from "@mantine/core";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { useUpdateBoard } from "@homarr/boards/updater";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { boardSaveLayoutsSchema, boardSavePartialSettingsSchema } from "@homarr/validation/board";

import { homarrLogoPath } from "~/components/layout/logo/homarr-logo";
import { SectionCard } from "~/components/manage/section-card";
import { UnsavedChangesBar } from "~/components/manage/unsaved-changes-bar";

import type { Board } from "../../_types";
import { ColorSettingsContent } from "./_appereance";
import { BackgroundSettingsContent } from "./_background";
import { BehaviorSettingsContent } from "./_behavior";
import { BoardAccessSettings } from "./_board-access";
import { CustomCssSettingsContent } from "./_customCss";
import { DangerZoneSettingsContent } from "./_danger";
import { GeneralSettingsContent } from "./_general";
import { LayoutSettingsContent } from "./_layout";
import { useSaveLayoutsMutation, useSavePartialSettingsMutation } from "./_shared";

const boardSettingsFormSchema = boardSavePartialSettingsSchema
  .extend({
    layouts: boardSaveLayoutsSchema.shape.layouts,
  })
  .required();

export type FormValues = z.infer<typeof boardSettingsFormSchema>;

const PARTIAL_FORM_KEYS = [
  "pageTitle",
  "metaTitle",
  "logoImageUrl",
  "faviconImageUrl",
  "backgroundImageUrl",
  "backgroundImageAttachment",
  "backgroundImageRepeat",
  "backgroundImageSize",
  "primaryColor",
  "secondaryColor",
  "opacity",
  "iconColor",
  "itemRadius",
  "customCss",
  "disableStatus",
] as const;

const buildInitialValues = (board: Board): FormValues => ({
  pageTitle: board.pageTitle ?? "",
  metaTitle: board.metaTitle ?? "",
  logoImageUrl: board.logoImageUrl ?? "",
  faviconImageUrl: board.faviconImageUrl ?? "",
  backgroundImageUrl: board.backgroundImageUrl ?? "",
  backgroundImageAttachment: board.backgroundImageAttachment,
  backgroundImageRepeat: board.backgroundImageRepeat,
  backgroundImageSize: board.backgroundImageSize,
  primaryColor: board.primaryColor,
  secondaryColor: board.secondaryColor,
  opacity: board.opacity,
  iconColor: board.iconColor ?? "",
  itemRadius: board.itemRadius,
  customCss: board.customCss ?? "",
  disableStatus: board.disableStatus,
  layouts: board.layouts,
});

interface BoardSettingsFormProps {
  board: Board;
  permissions: RouterOutputs["board"]["getBoardPermissions"];
  hasFullAccess: boolean;
  hideVisibility: boolean;
}

export const BoardSettingsForm = ({ board, permissions, hasFullAccess, hideVisibility }: BoardSettingsFormProps) => {
  const t = useI18n();
  const tSection = useScopedI18n("board.setting.section");
  const { updateBoard } = useUpdateBoard();
  const savePartialSettings = useSavePartialSettingsMutation(board);
  const saveLayouts = useSaveLayoutsMutation(board);

  const form = useZodForm(boardSettingsFormSchema, {
    initialValues: buildInitialValues(board),
    onValuesChange({ pageTitle }) {
      updateBoard((previous) => ({
        ...previous,
        pageTitle,
      }));
    },
  });

  const initialValuesRef = useRef(buildInitialValues(board));
  const lastSavedRef = useRef({ pageTitle: board.pageTitle, logoImageUrl: board.logoImageUrl });

  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  useEffect(() => {
    return () => {
      updateBoard((previous) => ({
        ...previous,
        pageTitle: lastSavedRef.current.pageTitle,
        logoImageUrl: lastSavedRef.current.logoImageUrl,
      }));
    };
  }, [updateBoard]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return;
      if (isDirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSubmitAsync = async (values: FormValues) => {
    const defaults = initialValuesRef.current;
    const changed = <TKey extends keyof FormValues>(...fields: TKey[]) =>
      fields.some((field) => values[field] !== defaults[field]);

    const { layouts, ...partialSettings } = values;

    const saveActions: { when: boolean; action: () => Promise<unknown> }[] = [
      {
        when: changed(...PARTIAL_FORM_KEYS),
        action: () =>
          savePartialSettings.mutateAsync({ id: board.id, ...partialSettings }).then(() => {
            updateFavicon(values.faviconImageUrl ?? homarrLogoPath);
          }),
      },
      {
        when: changed("layouts"),
        action: () => saveLayouts.mutateAsync({ id: board.id, layouts }),
      },
    ];

    const promises = saveActions.filter((saveAction) => saveAction.when).map((saveAction) => saveAction.action());
    if (promises.length === 0) return;

    try {
      await Promise.all(promises);
      lastSavedRef.current = { pageTitle: values.pageTitle, logoImageUrl: values.logoImageUrl };
      initialValuesRef.current = values;
      form.setInitialValues(values);
      form.resetDirty();
      await revalidatePathActionAsync(`/boards/${board.name}/settings`);
      showSuccessNotification({
        title: t("common.notification.update.success"),
        message: t("common.notification.update.success"),
      });
    } catch {
      showErrorNotification({
        title: t("common.notification.update.error"),
        message: t("common.notification.update.error"),
      });
    }
  };

  const handleDiscard = () => {
    form.setValues(initialValuesRef.current);
    form.resetDirty();
    updateBoard((previous) => ({
      ...previous,
      pageTitle: lastSavedRef.current.pageTitle,
      logoImageUrl: lastSavedRef.current.logoImageUrl,
    }));
  };

  const isPending = savePartialSettings.isPending || saveLayouts.isPending;

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack gap="xl">
        <GeneralSettingsContent board={board} form={form} />
        <LayoutSettingsContent form={form} />
        <BackgroundSettingsContent form={form} />
        <ColorSettingsContent form={form} />
        <CustomCssSettingsContent form={form} />
        <BehaviorSettingsContent form={form} />

        {hasFullAccess && (
          <SectionCard title={tSection("access.title")}>
            <BoardAccessSettings board={board} initialPermissions={permissions} />
          </SectionCard>
        )}

        {hasFullAccess && <DangerZoneSettingsContent hideVisibility={hideVisibility} />}

        {form.isDirty() && (
          <UnsavedChangesBar>
            <Button type="button" disabled={isPending} variant="default" onClick={handleDiscard}>
              {t("common.action.discard")}
            </Button>
            <Button loading={isPending} type="submit" disabled={!form.isValid()}>
              {t("common.action.saveChanges")}
            </Button>
          </UnsavedChangesBar>
        )}
      </Stack>
    </form>
  );
};

// Previously part of the general settings section; applied on the unified save
// https://github.com/homarr-labs/homarr/issues/4905
const updateFavicon = (url: string) => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  link.href = url;
};
