"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Stack, TableOfContents } from "@mantine/core";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { colorSchemes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { UnsavedChangesBar } from "~/components/manage/unsaved-changes-bar";
import { AnalyticsSettings } from "./analytics.settings";
import { AppearanceSettingsForm } from "./appearance-settings-form";
import { BoardSettingsForm } from "./board-settings-form";
import { CrawlingAndIndexingSettings } from "./crawling-and-indexing.settings";
import { CultureSettingsForm } from "./culture-settings-form";
import { SearchSettingsForm } from "./search-settings-form";
import classes from "./settings-form.module.css";
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
  selectableBoards: RouterOutputs["board"]["getPublicBoards"];
  selectableSearchEngines: RouterOutputs["searchEngine"]["getSelectable"];
}

export const SettingsForm = ({ initialData, selectableBoards, selectableSearchEngines }: SettingsFormProps) => {
  const t = useI18n();
  const tSettings = useScopedI18n("management.page.settings");

  const initialValues = buildInitialValues(initialData);
  const initialValuesRef = useRef(initialValues);

  const form = useZodForm(settingsFormSchema, {
    initialValues,
  });

  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveSettingsMutation = clientApi.serverSettings.saveSettings.useMutation({
    onError(error) {
      showErrorNotification({ title: t("common.notification.update.error"), message: error.message });
    },
  });

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

    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(promises);
      if (!results.every((result) => result.status === "fulfilled")) {
        return;
      }

      initialValuesRef.current = values;
      form.setInitialValues(values);
      form.resetDirty();
      await revalidatePathActionAsync("/manage/settings");
      showSuccessNotification({
        title: t("common.notification.update.success"),
        message: tSettings("notification.success.message"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    form.setValues(initialValuesRef.current);
    form.resetDirty();
  };

  const tableOfContentsData = [
    { id: "settings-board", value: tSettings("section.board.title"), depth: 1 },
    { id: "settings-user", value: tSettings("section.user.title"), depth: 1 },
    { id: "settings-search", value: tSettings("section.search.title"), depth: 1 },
    { id: "settings-appearance", value: tSettings("section.appearance.title"), depth: 1 },
    { id: "settings-culture", value: tSettings("section.culture.title"), depth: 1 },
    { id: "settings-analytics", value: tSettings("section.analytics.title"), depth: 1 },
    { id: "settings-crawling", value: tSettings("section.crawlingAndIndexing.title"), depth: 1 },
  ];

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack gap="xl">
        <div className={classes.layout}>
          <nav className={classes.navigation} aria-label={tSettings("title")}>
            <TableOfContents
              classNames={{ root: classes.tableOfContents, control: classes.control }}
              initialData={tableOfContentsData}
              minDepthToOffset={1}
              scrollSpyOptions={{
                selector: "[data-settings-section]",
                getDepth: () => 1,
                getValue: (element) => element.getAttribute("data-label") ?? "",
                offset: 80,
              }}
              getControlProps={({ data }) => ({
                onClick: () => data.getNode().scrollIntoView({ block: "start" }),
                children: data.value,
              })}
              variant="light"
            />
          </nav>

          <Stack className={classes.sections} gap="xl">
            <section
              id="settings-board"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.board.title")}
            >
              <BoardSettingsForm form={form} selectableBoards={selectableBoards} />
            </section>
            <section
              id="settings-user"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.user.title")}
            >
              <UserSettingsForm form={form} />
            </section>
            <section
              id="settings-search"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.search.title")}
            >
              <SearchSettingsForm form={form} selectableSearchEngines={selectableSearchEngines} />
            </section>
            <section
              id="settings-appearance"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.appearance.title")}
            >
              <AppearanceSettingsForm form={form} />
            </section>
            <section
              id="settings-culture"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.culture.title")}
            >
              <CultureSettingsForm form={form} />
            </section>
            <section
              id="settings-analytics"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.analytics.title")}
            >
              <AnalyticsSettings form={form} />
            </section>
            <section
              id="settings-crawling"
              className={classes.section}
              data-settings-section
              data-label={tSettings("section.crawlingAndIndexing.title")}
            >
              <CrawlingAndIndexingSettings form={form} />
            </section>
          </Stack>
        </div>

        {form.isDirty() && (
          <UnsavedChangesBar>
            <Button type="button" disabled={isSubmitting} variant="default" onClick={handleDiscard}>
              {t("common.action.discard")}
            </Button>
            <Button loading={isSubmitting} type="submit" disabled={!form.isValid()}>
              {t("common.action.saveChanges")}
            </Button>
          </UnsavedChangesBar>
        )}
      </Stack>
    </form>
  );
};
