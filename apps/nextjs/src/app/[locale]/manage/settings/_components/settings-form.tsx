"use client";

import { useEffect, useRef } from "react";
import { Button, Stack } from "@mantine/core";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { colorSchemes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";
import { useI18n } from "@homarr/translation/client";

import { UnsavedChangesBar } from "~/components/manage/unsaved-changes-bar";
import { AnalyticsSettings } from "./analytics.settings";
import { AppearanceSettingsForm } from "./appearance-settings-form";
import { BoardSettingsForm } from "./board-settings-form";
import { CrawlingAndIndexingSettings } from "./crawling-and-indexing.settings";
import { CultureSettingsForm } from "./culture-settings-form";
import { SearchSettingsForm } from "./search-settings-form";
import { UserSettingsForm } from "./user-settings-form";

const settingsFormSchema = z.object({
  enableGeneral: z.boolean(),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
  noTranslate: z.boolean(),
  noSiteLinksSearchBox: z.boolean(),
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
  enableGravatar: z.boolean(),
  defaultSearchEngineId: z.string().nullable(),
  defaultColorScheme: z.enum(colorSchemes),
  defaultLocale: z.string(),
});

export type FormValues = z.infer<typeof settingsFormSchema>;

const buildInitialValues = (initialData: ServerSettings): FormValues => ({
  enableGeneral: initialData.analytics.enableGeneral,
  noIndex: initialData.crawlingAndIndexing.noIndex,
  noFollow: initialData.crawlingAndIndexing.noFollow,
  noTranslate: initialData.crawlingAndIndexing.noTranslate,
  noSiteLinksSearchBox: initialData.crawlingAndIndexing.noSiteLinksSearchBox,
  homeBoardId: initialData.board.homeBoardId,
  mobileHomeBoardId: initialData.board.mobileHomeBoardId,
  enableStatusByDefault: initialData.board.enableStatusByDefault,
  forceDisableStatus: initialData.board.forceDisableStatus,
  enableGravatar: initialData.user.enableGravatar,
  defaultSearchEngineId: initialData.search.defaultSearchEngineId,
  defaultColorScheme: initialData.appearance.defaultColorScheme,
  defaultLocale: initialData.culture.defaultLocale,
});

interface SettingsFormProps {
  initialData: ServerSettings;
}

export const SettingsForm = ({ initialData }: SettingsFormProps) => {
  const t = useI18n();

  const initialValues = buildInitialValues(initialData);
  const initialValuesRef = useRef(initialValues);

  const form = useZodForm(settingsFormSchema, {
    initialValues,
  });

  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  const saveSettingsMutation = clientApi.serverSettings.saveSettings.useMutation();

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

    const groups: {
      settingsKey: (typeof defaultServerSettingsKeys)[number];
      when: boolean;
      value: Record<string, unknown>;
    }[] = [
      { settingsKey: "analytics", when: changed("enableGeneral"), value: { enableGeneral: values.enableGeneral } },
      {
        settingsKey: "crawlingAndIndexing",
        when: changed("noIndex", "noFollow", "noTranslate", "noSiteLinksSearchBox"),
        value: {
          noIndex: values.noIndex,
          noFollow: values.noFollow,
          noTranslate: values.noTranslate,
          noSiteLinksSearchBox: values.noSiteLinksSearchBox,
        },
      },
      {
        settingsKey: "board",
        when: changed("homeBoardId", "mobileHomeBoardId", "enableStatusByDefault", "forceDisableStatus"),
        value: {
          homeBoardId: values.homeBoardId,
          mobileHomeBoardId: values.mobileHomeBoardId,
          enableStatusByDefault: values.enableStatusByDefault,
          forceDisableStatus: values.forceDisableStatus,
        },
      },
      { settingsKey: "user", when: changed("enableGravatar"), value: { enableGravatar: values.enableGravatar } },
      {
        settingsKey: "search",
        when: changed("defaultSearchEngineId"),
        value: { defaultSearchEngineId: values.defaultSearchEngineId },
      },
      {
        settingsKey: "appearance",
        when: changed("defaultColorScheme"),
        value: { defaultColorScheme: values.defaultColorScheme },
      },
      { settingsKey: "culture", when: changed("defaultLocale"), value: { defaultLocale: values.defaultLocale } },
    ];

    const promises = groups
      .filter((group) => group.when)
      .map((group) => saveSettingsMutation.mutateAsync({ settingsKey: group.settingsKey, value: group.value }));
    if (promises.length === 0) return;

    try {
      await Promise.all(promises);
      initialValuesRef.current = values;
      form.setInitialValues(values);
      form.resetDirty();
      await revalidatePathActionAsync("/manage/settings");
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
  };

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack gap="xl">
        <AnalyticsSettings form={form} />
        <CrawlingAndIndexingSettings form={form} />
        <BoardSettingsForm form={form} />
        <UserSettingsForm form={form} />
        <SearchSettingsForm form={form} />
        <AppearanceSettingsForm form={form} />
        <CultureSettingsForm form={form} />

        {form.isDirty() && (
          <UnsavedChangesBar>
            <Button disabled={saveSettingsMutation.isPending} variant="default" onClick={handleDiscard}>
              {t("common.action.discard")}
            </Button>
            <Button loading={saveSettingsMutation.isPending} type="submit" disabled={!form.isValid()}>
              {t("common.action.saveChanges")}
            </Button>
          </UnsavedChangesBar>
        )}
      </Stack>
    </form>
  );
};
