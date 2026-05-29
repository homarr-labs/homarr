"use client";

import { Group, Stack, Switch, Text } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { ColorScheme } from "@homarr/definitions";
import type { UserPreferenceKey } from "@homarr/settings";
import { localeConfigurations } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createChildrenOptions } from "../../../../lib/children";
import type { ChildrenAction } from "../../../../lib/children";
import { interaction } from "../../../../lib/interaction";
import { useUserPreferences } from "../../../../preferences/use-user-preference";
import { preferenceChildrenOptionsByKey, preferenceIcons, visiblePreferenceDefinitions } from "./registry";

dayjs.extend(localeData);

type SettingsAction = ChildrenAction<Record<string, unknown>>;

const weekDays = dayjs.weekdays(false);

const BooleanRow = ({
  label,
  Icon,
  checked,
  isPending,
}: {
  label: string;
  Icon: TablerIcon;
  checked: boolean;
  isPending: boolean;
}) => (
  <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%">
    <Group wrap="nowrap" gap="sm">
      <Icon stroke={1.5} size={20} />
      <Text>{label}</Text>
    </Group>
    <Switch checked={checked} readOnly size="md" disabled={isPending} styles={{ track: { cursor: "pointer" } }} />
  </Group>
);

const SelectRow = ({ label, Icon, valueLabel }: { label: string; Icon: TablerIcon; valueLabel: string }) => (
  <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%">
    <Group wrap="nowrap" gap="sm">
      <Icon stroke={1.5} size={20} />
      <Text>{label}</Text>
    </Group>
    <Text size="sm" c="dimmed">
      {valueLabel}
    </Text>
  </Group>
);

const LinkRow = ({ label, Icon }: { label: string; Icon: TablerIcon }) => (
  <Group mx="md" my="sm" wrap="nowrap" gap="sm">
    <Icon stroke={1.5} size={20} />
    <Text>{label}</Text>
  </Group>
);

const useSettingsActions = (_: Record<string, unknown>, query: string): SettingsAction[] => {
  const t = useScopedI18n("search.mode.command.group.preferences.option");
  const tColorScheme = useScopedI18n("common.colorScheme.options");
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const normalizedQuery = query.trim().toLowerCase();
  const preferences = useUserPreferences();

  const colorScheme = preferences.getPreference("colorScheme");
  const locale = preferences.getPreference("locale");
  const defaultSearchEngineId = preferences.getPreference("defaultSearchEngineId");
  const openSearchInNewTab = preferences.getPreference("openSearchInNewTab");
  const ddgBangs = preferences.getPreference("ddgBangs");
  const firstDayOfWeek = preferences.getPreference("firstDayOfWeek");
  const homeBoardId = preferences.getPreference("homeBoardId");
  const mobileHomeBoardId = preferences.getPreference("mobileHomeBoardId");
  const pingIconsEnabled = preferences.getPreference("pingIconsEnabled");

  const boardsQuery = clientApi.board.getAllBoards.useQuery(undefined, { enabled: isAuthenticated });
  const searchEnginesQuery = clientApi.searchEngine.getSelectable.useQuery(undefined, { enabled: isAuthenticated });

  const boards = boardsQuery.data ?? [];
  const engines = searchEnginesQuery.data ?? [];

  const prefState: Record<
    Exclude<UserPreferenceKey, "fullPreferencesPage">,
    { value: unknown; setValue: (v: never) => void; isPending: boolean }
  > = {
    colorScheme,
    locale,
    defaultSearchEngineId,
    openSearchInNewTab,
    ddgBangs,
    firstDayOfWeek,
    homeBoardId,
    mobileHomeBoardId,
    pingIconsEnabled,
  };

  const valueLabels: Record<Exclude<UserPreferenceKey, "fullPreferencesPage">, string> = {
    colorScheme: tColorScheme(colorScheme.value as ColorScheme),
    locale: localeConfigurations[locale.value as keyof typeof localeConfigurations]?.name ?? String(locale.value),
    defaultSearchEngineId:
      engines.find((e) => e.value === defaultSearchEngineId.value)?.label ?? t("searchEngine.none"),
    openSearchInNewTab: "",
    ddgBangs: "",
    firstDayOfWeek: weekDays[firstDayOfWeek.value as DayOfWeek] ?? String(firstDayOfWeek.value),
    homeBoardId: boards.find((b) => b.id === homeBoardId.value)?.name ?? t("board.none"),
    mobileHomeBoardId: boards.find((b) => b.id === mobileHomeBoardId.value)?.name ?? t("board.none"),
    pingIconsEnabled: "",
  };

  const definitions = visiblePreferenceDefinitions(isAuthenticated);

  return definitions.flatMap((definition): SettingsAction[] => {
    const label = t(`${definition.key}.label` as never);
    const Icon = preferenceIcons[definition.key];

    const matchesSearch = [label, ...definition.aliases].some((value) => value.toLowerCase().includes(normalizedQuery));
    if (!matchesSearch) return [];

    if (definition.kind === "boolean") {
      const state = prefState[definition.key as keyof typeof prefState];
      const checked = state.value as boolean;
      return [
        {
          key: definition.key,
          Component: () => <BooleanRow label={label} Icon={Icon} checked={checked} isPending={state.isPending} />,
          useInteraction: interaction.javaScript(() => ({
            onSelect: state.isPending ? () => undefined : () => state.setValue(!checked as never),
            closeSpotlightOnTrigger: false,
          })),
        },
      ];
    }

    if (definition.kind === "link") {
      return [
        {
          key: definition.key,
          Component: () => <LinkRow label={label} Icon={Icon} />,
          useInteraction: interaction.link(() => ({
            href: `/manage/users/${session?.user.id ?? ""}/general`,
          })),
        },
      ];
    }

    const childrenKey = definition.key as keyof typeof preferenceChildrenOptionsByKey;
    return [
      {
        key: definition.key,
        Component: () => (
          <SelectRow label={label} Icon={Icon} valueLabel={valueLabels[definition.key as keyof typeof valueLabels]} />
        ),
        useInteraction: interaction.children(preferenceChildrenOptionsByKey[childrenKey]),
      },
    ];
  });
};

export const settingsChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: useSettingsActions,
  DetailComponent: () => {
    const t = useScopedI18n("search.mode.command.group.preferences");
    return (
      <Stack mx="md" my="sm" gap="xs">
        <Text>{t("title")}</Text>
        <Text size="xs" c="dimmed">
          {t("children.detail.backHint")}
        </Text>
      </Stack>
    );
  },
});
