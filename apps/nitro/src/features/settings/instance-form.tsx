import { Anchor, Select, Stack, Switch, Text } from "@mantine/core";

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import { SettingSwitchView } from "../../../../../packages/ui/src/source-views/identity-settings/setting-switch-view";
import { BoardSelect } from "../../source-ui/settings/board-select";
import type { HeaderComposerBoard } from "../../source-ui/settings/header-composer";

import { BrandingSettingsFields } from "./branding-fields";
import type { BrandingEditorSlots } from "./branding-fields";
import type { InstanceSettings, SelectableSearchEngines, SettingsAccess, SettingsFeatureClient } from "./client";
import { settingsLanguageOptions } from "./culture";
import { saveInstanceSettings, toInstanceSettingsValues } from "./data";
import { useSettingsDraft } from "./draft";
import { SettingsFeedback } from "./feedback";
import { instanceSettingsSchema } from "./schema";
import type { InstanceSettingsValues } from "./schema";
import { SettingsSection } from "./section";

export function InstanceSettingsForm({
  client,
  initialData,
  searchEngines,
  boards = [],
  access,
  cacheScope,
  brandingSlots,
  analyticsDocumentationHref,
  onSaved,
}: {
  readonly client: SettingsFeatureClient;
  readonly initialData: InstanceSettings;
  readonly searchEngines: SelectableSearchEngines;
  readonly boards?: readonly HeaderComposerBoard[];
  readonly access: SettingsAccess;
  readonly cacheScope: string;
  readonly brandingSlots?: BrandingEditorSlots;
  readonly analyticsDocumentationHref: string;
  readonly onSaved?: (settings: InstanceSettings) => void;
}) {
  const t = useI18n();
  const draft = useSettingsDraft(
    toInstanceSettingsValues(initialData),
    instanceSettingsSchema,
    (values, baseline) => {
      if (access.kind !== "editable") throw new Error(access.reason);
      return saveInstanceSettings(client, values, baseline);
    },
    { cacheScope, client, targetId: "instance", access: access.kind, onSaved },
  );
  const disabled = access.kind !== "editable" || draft.status.kind === "pending";
  const values = draft.values;
  const change = <Key extends keyof InstanceSettingsValues>(key: Key, value: InstanceSettingsValues[Key]) => {
    if (!disabled) draft.change(key, value);
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
      <Stack gap="xl">
        <SettingsSection title={t("common.entity.boards")}>
          <BoardSelect
            label={t("management.page.settings.section.board.homeBoard.label")}
            description={t("management.page.settings.section.board.homeBoard.description")}
            boards={boards}
            clearable
            disabled={disabled || boards.length === 0}
            value={values.board.homeBoardId}
            error={draft.error("board.homeBoardId")}
            onChange={(homeBoardId) => change("board", { ...values.board, homeBoardId })}
          />
          <BoardSelect
            label={t("management.page.settings.section.board.homeBoard.mobileLabel")}
            description={t("management.page.settings.section.board.homeBoard.description")}
            boards={boards}
            clearable
            disabled={disabled || boards.length === 0}
            value={values.board.mobileHomeBoardId}
            error={draft.error("board.mobileHomeBoardId")}
            onChange={(mobileHomeBoardId) => change("board", { ...values.board, mobileHomeBoardId })}
          />
          <Text fw={500}>{t("management.page.settings.section.board.status.title")}</Text>
          <Switch
            label={t("management.page.settings.section.board.status.enableStatusByDefault.label")}
            description={t("management.page.settings.section.board.status.enableStatusByDefault.description")}
            checked={values.board.enableStatusByDefault}
            disabled={disabled}
            onChange={(event) =>
              change("board", { ...values.board, enableStatusByDefault: event.currentTarget.checked })
            }
          />
          <Switch
            label={t("management.page.settings.section.board.status.forceDisableStatus.label")}
            description={t("management.page.settings.section.board.status.forceDisableStatus.description")}
            checked={values.board.forceDisableStatus}
            disabled={disabled}
            onChange={(event) => change("board", { ...values.board, forceDisableStatus: event.currentTarget.checked })}
          />
        </SettingsSection>
        <SettingsSection title={t("common.entity.users")}>
          <Switch
            label={t("management.page.settings.section.user.enableGravatar.label")}
            description={t("management.page.settings.section.user.enableGravatar.description")}
            checked={values.user.enableGravatar}
            disabled={disabled}
            onChange={(event) => change("user", { enableGravatar: event.currentTarget.checked })}
          />
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.search.title")}>
          <Select
            label={t("management.page.settings.section.search.defaultSearchEngine.label")}
            description={t("management.page.settings.section.search.defaultSearchEngine.description")}
            data={searchEngines}
            value={values.search.defaultSearchEngineId}
            disabled={disabled}
            error={draft.error("search.defaultSearchEngineId")}
            onChange={(next) => change("search", { defaultSearchEngineId: next })}
          />
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.appearance.title")}>
          <Select<InstanceSettingsValues["appearance"]["defaultColorScheme"]>
            label={t("management.page.settings.section.appearance.defaultColorScheme.label")}
            data={(["auto", "light", "dark"] as const).map((value) => ({
              value,
              label: t(`common.colorScheme.options.${value}`),
            }))}
            value={values.appearance.defaultColorScheme}
            allowDeselect={false}
            disabled={disabled}
            error={draft.error("appearance.defaultColorScheme")}
            onChange={(next) => {
              if (next !== null) change("appearance", { defaultColorScheme: next });
            }}
          />
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.branding.title")}>
          <BrandingSettingsFields
            value={values.branding}
            onChange={(next) => change("branding", next)}
            disabled={disabled}
            error={draft.error}
            slots={brandingSlots}
          />
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.culture.title")}>
          <Select
            label={t("management.page.settings.section.culture.defaultLocale.label")}
            data={[...settingsLanguageOptions]}
            value={values.culture.defaultLocale}
            allowDeselect={false}
            searchable
            disabled={disabled}
            error={draft.error("culture.defaultLocale")}
            nothingFoundMessage={t("common.noResults")}
            onChange={(next) => {
              if (next !== null) change("culture", { defaultLocale: next });
            }}
          />
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.analytics.title")}>
          <SettingSwitchView
            title={t("management.page.settings.section.analytics.general.title")}
            text={t("management.page.settings.section.analytics.general.text")}
            checked={values.analytics.enableGeneral}
            disabled={disabled}
            onToggle={() => change("analytics", { enableGeneral: !values.analytics.enableGeneral })}
          />
          <Anchor href={analyticsDocumentationHref} target="_blank" rel="noopener noreferrer" size="sm">
            {t("management.page.settings.section.analyticsDocumentation")}
          </Anchor>
        </SettingsSection>
        <SettingsSection title={t("management.page.settings.section.crawlingAndIndexing.title")}>
          <Text c="dimmed" size="sm">
            {t("management.page.settings.section.crawlingAndIndexing.warning")}
          </Text>
          {(["noIndex", "noFollow", "noTranslate", "noSiteLinksSearchBox"] as const).map((field) => (
            <SettingSwitchView
              key={field}
              title={t(`management.page.settings.section.crawlingAndIndexing.${field}.title`)}
              text={t(`management.page.settings.section.crawlingAndIndexing.${field}.text`)}
              checked={values.crawlingAndIndexing[field]}
              disabled={disabled}
              onToggle={() =>
                change("crawlingAndIndexing", {
                  ...values.crawlingAndIndexing,
                  [field]: !values.crawlingAndIndexing[field],
                })
              }
            />
          ))}
        </SettingsSection>
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
