"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Stack, Tabs, VisuallyHidden } from "@mantine/core";
import { IconAdjustments, IconCode, IconLayoutGrid, IconPalette, IconUsers } from "@tabler/icons-react";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useUpdateBoard } from "@homarr/boards/updater";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { BOARD_FIXED_ITEM_SIZE_DEFAULT } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutsSchema, boardSavePartialSettingsSchema } from "@homarr/validation/board";

import { homarrLogoPath } from "~/components/layout/logo/constants";
import { SectionCard } from "~/components/manage/section-card";
import { UnsavedChangesBar } from "~/components/manage/unsaved-changes-bar";
import { useUnsavedChangesGuard } from "~/components/manage/use-unsaved-changes-guard";

import type { Board } from "../../_types";
import { AppearancePlayground } from "./_appearance-playground";
import { BehaviorSettingsContent } from "./_behavior";
import { BoardAccessSettings } from "./_board-access";
import { CustomCssSettingsContent } from "./_customCss";
import { DangerZoneSettingsContent } from "./_danger";
import { GeneralSettingsContent } from "./_general";
import { LayoutSettingsContent } from "./_layout";
import { useSaveLayoutsMutation, useSavePartialSettingsMutation } from "./_shared";
import classes from "./_settings-form.module.css";

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
  "fixedScaling",
  "fixedItemSize",
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
  fixedScaling: board.fixedScaling ?? false,
  fixedItemSize: board.fixedItemSize ?? BOARD_FIXED_ITEM_SIZE_DEFAULT,
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
  const [activeTab, setActiveTab] = useState<string | null>("layout");
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const appIds = useMemo(
    () =>
      Array.from(
        new Set(
          board.items.flatMap((item) => {
            if (item.kind === "app" && typeof item.options.appId === "string") return [item.options.appId];
            return [];
          }),
        ),
      ),
    [board.items],
  );
  const { data: apps = [] } = clientApi.app.byIds.useQuery(appIds, { enabled: appIds.length > 0 });

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

  useUnsavedChangesGuard(form.isDirty(), { guardBeforeUnload: env.NODE_ENV !== "development" });

  useEffect(() => {
    return () => {
      updateBoard((previous) => ({
        ...previous,
        pageTitle: lastSavedRef.current.pageTitle,
        logoImageUrl: lastSavedRef.current.logoImageUrl,
      }));
    };
  }, [updateBoard]);

  const revealValidationErrors = (errors: typeof form.errors) => {
    const firstField = Object.keys(errors)[0];
    if (firstField) setActiveTab(getSettingsTabForField(firstField));
    const layoutField = Object.keys(errors).find((field) => /^layouts\.\d+\./.test(field));
    if (layoutField) {
      const layout = form.values.layouts[Number(layoutField.split(".")[1])];
      if (layout) setSelectedLayoutId(layout.id);
    }
  };

  const saveSettingsAsync = async (values: FormValues): Promise<FormValues | null> => {
    const validation = form.validate();
    if (validation.hasErrors) {
      revealValidationErrors(validation.errors);
      return null;
    }
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
    form.clearErrors();
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
    <Tabs
      value={activeTab}
      onChange={setActiveTab}
      keepMounted={false}
      classNames={{ root: classes.settings, list: classes.tabs, panel: classes.panel }}
    >
      <VisuallyHidden>
        <h2>{tSection("navigation")}</h2>
      </VisuallyHidden>
      <Tabs.List aria-label={tSection("navigation")}>
        <Tabs.Tab value="layout" leftSection={<IconLayoutGrid size={16} />}>
          {tSection("layout.title")}
        </Tabs.Tab>
        <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
          {tSection("appearance.title")}
        </Tabs.Tab>
        <Tabs.Tab value="general" leftSection={<IconAdjustments size={16} />}>
          {tSection("general.title")}
        </Tabs.Tab>
        <Tabs.Tab value="advanced" leftSection={<IconCode size={16} />}>
          {tSection("advanced")}
        </Tabs.Tab>
        {hasFullAccess && (
          <Tabs.Tab value="access" leftSection={<IconUsers size={16} />}>
            {tSection("access.title")}
          </Tabs.Tab>
        )}
      </Tabs.List>
      <form onSubmit={form.onSubmit((values) => void saveSettingsAsync(values), revealValidationErrors)}>
        {Object.keys(form.errors).length > 0 && (
          <Alert color="red" mt="md">
            {tSection("validationError")}
          </Alert>
        )}
        <Tabs.Panel value="layout">
          <LayoutSettingsContent
            board={board}
            form={form}
            isSaving={isPending}
            saveSettingsAsync={() => saveSettingsAsync(form.values)}
            selectedLayoutId={selectedLayoutId}
            setSelectedLayoutId={setSelectedLayoutId}
            apps={apps}
          />
        </Tabs.Panel>
        <Tabs.Panel value="appearance">
          <AppearancePlayground board={board} form={form} apps={apps} selectedLayoutId={selectedLayoutId} />
        </Tabs.Panel>
        <Tabs.Panel value="general">
          <Stack gap="lg">
            <GeneralSettingsContent board={board} form={form} />
            <BehaviorSettingsContent form={form} />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="advanced">
          <CustomCssSettingsContent form={form} />
        </Tabs.Panel>

        {form.isDirty() && (
          <UnsavedChangesBar>
            <Button type="button" disabled={isPending} variant="default" onClick={handleDiscard}>
              {t("action.discard")}
            </Button>
            <Button loading={isPending} type="submit">
              {t("action.saveChanges")}
            </Button>
          </UnsavedChangesBar>
        )}
      </form>

      {hasFullAccess && (
        <Tabs.Panel value="access">
          <Stack gap="lg">
            <SectionCard title={tSection("access.title")}>
              <BoardAccessSettings board={board} initialPermissions={permissions} />
            </SectionCard>
            <DangerZoneSettingsContent hideVisibility={hideVisibility} />
          </Stack>
        </Tabs.Panel>
      )}
    </Tabs>
  );
};

const getSettingsTabForField = (field: string) => {
  if (field.startsWith("layouts") || field === "fixedScaling" || field === "fixedItemSize") return "layout";
  if (field === "customCss") return "advanced";
  if (
    field.startsWith("background") ||
    ["primaryColor", "secondaryColor", "opacity", "iconColor", "itemRadius"].includes(field)
  )
    return "appearance";
  return "general";
};

// Previously part of the general settings section; applied on the unified save
// https://github.com/homarr-labs/homarr/issues/4905
const updateFavicon = (url: string) => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  link.href = url;
};
