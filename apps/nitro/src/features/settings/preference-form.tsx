import { Group, Radio, Select, SimpleGrid, Stack, Switch, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import { HeaderComposer } from "../../source-ui/settings/header-composer";
import type { HeaderComposerBoard, HeaderComposerProps } from "../../source-ui/settings/header-composer";
import { BoardSelect } from "../../source-ui/settings/board-select";

import type { SelectableSearchEngines, SettingsAccess, SettingsFeatureClient, UserPreferences } from "./client";
import type { SettingsFormatting } from "./culture";
import { savePreferenceSettings, toPreferenceSettingsValues } from "./data";
import { useSettingsDraft } from "./draft";
import { SettingsFeedback } from "./feedback";
import { preferenceSettingsSchema } from "./schema";
import type { PreferenceSettingsValues } from "./schema";
import { SettingsSection } from "./section";

export function PreferenceSettingsForm({
  client,
  initialData,
  searchEngines,
  boards = [],
  headerComposer,
  formatting,
  access,
  cacheScope,
  languageSlot,
  onSaved,
}: {
  readonly client: SettingsFeatureClient;
  readonly initialData: UserPreferences;
  readonly searchEngines: SelectableSearchEngines;
  readonly boards?: readonly HeaderComposerBoard[];
  readonly headerComposer: Pick<HeaderComposerProps, "appName" | "logo" | "renderBoardPreview">;
  readonly formatting: SettingsFormatting;
  readonly access: SettingsAccess;
  readonly cacheScope: string;
  readonly languageSlot?: ReactNode;
  readonly onSaved?: (preferences: UserPreferences) => void;
}) {
  const t = useI18n();
  const draft = useSettingsDraft(
    toPreferenceSettingsValues(initialData),
    preferenceSettingsSchema,
    (values, baseline) => {
      if (access.kind !== "editable") throw new Error(access.reason);
      return savePreferenceSettings(client, initialData.userId, values, baseline);
    },
    { cacheScope, client, targetId: initialData.userId, access: access.kind, onSaved },
  );
  const disabled = access.kind !== "editable" || draft.status.kind === "pending";
  const values = draft.values;
  const change = <Key extends keyof PreferenceSettingsValues>(key: Key, next: PreferenceSettingsValues[Key]) => {
    if (!disabled) draft.change(key, next);
  };
  if (access.kind === "denied")
    return (
      <SettingsFeedback access={access} status={{ kind: "idle" }} dirty={false} valid={false} onDiscard={() => {}} />
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) void draft.submit();
      }}
    >
      <Stack gap="lg">
        <HeaderComposer
          {...headerComposer}
          value={values.headerPreferences}
          onChange={(next) => change("headerPreferences", next)}
          boards={boards}
          homeBoardId={values.homeBoardId}
          mobileHomeBoardId={values.mobileHomeBoardId}
          disabled={disabled}
        />
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <SettingsSection title={t("management.page.user.setting.general.item.board.title")}>
            <BoardSelect
              label={t("management.page.user.setting.general.item.board.type.general")}
              boards={boards}
              value={values.homeBoardId}
              onChange={(next) => change("homeBoardId", next)}
              error={draft.error("homeBoardId")}
              disabled={disabled || boards.length === 0}
              clearable
            />
            <BoardSelect
              label={t("management.page.user.setting.general.item.board.type.mobile")}
              boards={boards}
              value={values.mobileHomeBoardId}
              onChange={(next) => change("mobileHomeBoardId", next)}
              error={draft.error("mobileHomeBoardId")}
              disabled={disabled || boards.length === 0}
              clearable
            />
          </SettingsSection>
          <SettingsSection title={t("management.page.user.setting.general.item.search")}>
            <Select
              label={t("user.field.defaultSearchEngine.label")}
              data={searchEngines}
              value={values.defaultSearchEngineId}
              error={draft.error("defaultSearchEngineId")}
              disabled={disabled}
              onChange={(next) => change("defaultSearchEngineId", next)}
            />
            <Switch
              label={t("user.field.openSearchInNewTab.label")}
              checked={values.openSearchInNewTab}
              disabled={disabled}
              onChange={(event) => change("openSearchInNewTab", event.currentTarget.checked)}
            />
            <Switch
              label={t("user.field.ddgBangs.label")}
              checked={values.ddgBangs}
              disabled={disabled}
              onChange={(event) => change("ddgBangs", event.currentTarget.checked)}
            />
          </SettingsSection>
          <SettingsSection title={t("management.page.settings.section.appearance.title")}>
            <Select<PreferenceSettingsValues["colorScheme"]>
              label={t("management.page.settings.section.appearance.defaultColorScheme.label")}
              data={(["auto", "light", "dark"] as const).map((value) => ({
                value,
                label: t(`common.colorScheme.options.${value}`),
              }))}
              value={values.colorScheme}
              allowDeselect={false}
              error={draft.error("colorScheme")}
              disabled={disabled}
              onChange={(next) => {
                if (next !== null) change("colorScheme", next);
              }}
            />
          </SettingsSection>
          <SettingsSection title={t("management.page.user.setting.general.item.language")}>
            {languageSlot}
            <Radio.Group
              label={t("management.page.user.setting.general.item.firstDayOfWeek")}
              value={String(values.firstDayOfWeek)}
              error={draft.error("firstDayOfWeek")}
              onChange={(next) => {
                const parsed = preferenceSettingsSchema.shape.firstDayOfWeek.safeParse(Number(next));
                if (parsed.success) change("firstDayOfWeek", parsed.data);
              }}
            >
              <Group mt="xs" wrap="wrap">
                {([1, 6, 0] as const).map((day) => (
                  <Radio key={day} value={String(day)} label={formatting.weekdays[day]} disabled={disabled} />
                ))}
              </Group>
            </Radio.Group>
            <Select<PreferenceSettingsValues["byteUnitSystem"]>
              label={t("user.field.byteUnitSystem.label")}
              description={t("user.field.byteUnitSystem.description")}
              data={[
                { value: "decimal", label: `${t("user.field.byteUnitSystem.options.decimal")} (KB, MB, GB)` },
                { value: "binary", label: `${t("user.field.byteUnitSystem.options.binary")} (KiB, MiB, GiB)` },
              ]}
              value={values.byteUnitSystem}
              allowDeselect={false}
              error={draft.error("byteUnitSystem")}
              disabled={disabled}
              onChange={(next) => {
                if (next !== null) change("byteUnitSystem", next);
              }}
            />
          </SettingsSection>
          <SettingsSection title={t("management.page.user.setting.general.item.accessibility")}>
            <Title order={4}>{t("management.page.user.setting.general.item.accessibility")}</Title>
            <Switch
              label={t("user.field.pingIconsEnabled.label")}
              checked={values.pingIconsEnabled}
              disabled={disabled}
              onChange={(event) => change("pingIconsEnabled", event.currentTarget.checked)}
            />
            <Switch
              label={t("user.field.enableRightClickOnWidgets.label")}
              description={t("user.field.enableRightClickOnWidgets.description")}
              checked={values.enableRightClickOnWidgets}
              disabled={disabled}
              onChange={(event) => change("enableRightClickOnWidgets", event.currentTarget.checked)}
            />
          </SettingsSection>
        </SimpleGrid>
        <SettingsFeedback
          access={access}
          status={draft.status}
          dirty={draft.dirty}
          valid={draft.valid}
          onDiscard={draft.discard}
        />
      </Stack>
    </form>
  );
}
