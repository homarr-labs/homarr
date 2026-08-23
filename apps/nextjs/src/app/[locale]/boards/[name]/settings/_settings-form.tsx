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
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutsSchema, boardSavePartialSettingsSchema } from "@homarr/validation/board";

import { homarrLogoPath } from "~/components/layout/logo/constants";
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

const normalizeMobileLayoutGutters = (layouts: readonly FormValues["layouts"][number][]) =>
  layouts.map((layout) =>
    layout.role === "mobile" ? { ...layout, leftGutterColumnCount: 0, rightGutterColumnCount: 0 } : layout,
  );

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
  layouts: normalizeMobileLayoutGutters(board.layouts),
});

interface BoardSettingsFormProps {
  board: Board;
  permissions: RouterOutputs["board"]["getBoardPermissions"];
  hasFullAccess: boolean;
  hideVisibility: boolean;
}

export const BoardSettingsForm = ({ board, permissions, hasFullAccess, hideVisibility }: BoardSettingsFormProps) => {
  const t = useI18n("common");
  const tSection = useI18n("board.setting.section");
  const { branding } = useSettings();
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

  const saveSettingsAsync = async (values: FormValues): Promise<FormValues | null> => {
    const defaults = initialValuesRef.current;
    const changed = <TKey extends keyof FormValues>(...fields: TKey[]) =>
      fields.some((field) => values[field] !== defaults[field]);

    const { layouts: submittedLayouts, ...partialSettings } = values;
    const layouts = normalizeMobileLayoutGutters(submittedLayouts);
    const partialSettingsChanged = changed(...PARTIAL_FORM_KEYS);
    const layoutsChanged = changed("layouts");
    if (!partialSettingsChanged && !layoutsChanged) return values;

    try {
      const [, canonicalLayouts] = await Promise.all([
        partialSettingsChanged
          ? savePartialSettings.mutateAsync({ id: board.id, ...partialSettings }).then(() => {
              updateFavicon(
                values.faviconImageUrl ?? branding.faviconImageUrl ?? branding.logoImageUrl ?? homarrLogoPath,
              );
            })
          : Promise.resolve(),
        layoutsChanged ? saveLayouts.mutateAsync({ id: board.id, layouts }) : Promise.resolve(null),
      ]);
      const canonicalValues = canonicalLayouts ? { ...values, layouts: canonicalLayouts } : values;

      lastSavedRef.current = { pageTitle: canonicalValues.pageTitle, logoImageUrl: canonicalValues.logoImageUrl };
      initialValuesRef.current = canonicalValues;
      form.setValues(canonicalValues);
      form.setInitialValues(canonicalValues);
      form.resetDirty(canonicalValues);
      await revalidatePathActionAsync(`/boards/${board.name}/settings`);
      showSuccessNotification({
        title: t("notification.update.success"),
        message: t("notification.update.success"),
      });
      return canonicalValues;
    } catch {
      showErrorNotification({
        title: t("notification.update.error"),
        message: t("notification.update.error"),
      });
      return null;
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
    <Stack gap="xl">
      <form onSubmit={form.onSubmit((values) => void saveSettingsAsync(values))}>
        <Stack gap="xl">
          <GeneralSettingsContent board={board} form={form} />
          <LayoutSettingsContent
            board={board}
            form={form}
            isSaving={isPending}
            saveSettingsAsync={() => saveSettingsAsync(form.values)}
          />
          <BackgroundSettingsContent form={form} />
          <ColorSettingsContent form={form} />
          <CustomCssSettingsContent form={form} />
          <BehaviorSettingsContent form={form} />

          {form.isDirty() && (
            <UnsavedChangesBar>
              <Button type="button" disabled={isPending} variant="default" onClick={handleDiscard}>
                {t("action.discard")}
              </Button>
              <Button loading={isPending} type="submit" disabled={!form.isValid()}>
                {t("action.saveChanges")}
              </Button>
            </UnsavedChangesBar>
          )}
        </Stack>
      </form>

      {hasFullAccess && (
        <SectionCard title={tSection("access.title")}>
          <BoardAccessSettings board={board} initialPermissions={permissions} />
        </SectionCard>
      )}

      {hasFullAccess && <DangerZoneSettingsContent hideVisibility={hideVisibility} />}
    </Stack>
  );
};

// Previously part of the general settings section; applied on the unified save
// https://github.com/homarr-labs/homarr/issues/4905
const updateFavicon = (url: string) => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  link.href = url;
};
