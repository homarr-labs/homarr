"use client";

import { Group, Stack, Switch, Text } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { ColorScheme } from "@homarr/definitions";
import { visiblePreferenceDefinitions } from "@homarr/settings";
import { localeConfigurations } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createChildrenOptions } from "../../../../lib/children";
import type { ChildrenAction } from "../../../../lib/children";
import { interaction } from "../../../../lib/interaction";
import { useUserPreferences } from "../../../../preferences/use-user-preference";
import { preferenceChildrenOptionsByKey, preferenceIcons } from "../../../../preferences/preference-registry";

dayjs.extend(localeData);

type SettingsAction = ChildrenAction<Record<string, unknown>>;

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

const SELECT_KINDS = new Set(["select", "searchEngine", "board"]);

const useSettingsActions = (_: Record<string, unknown>, query: string): SettingsAction[] => {
  const t = useScopedI18n("search.mode.command.group.preferences.option");
  const tColorScheme = useScopedI18n("common.colorScheme.options");
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const normalizedQuery = query.trim().toLowerCase();
  const preferences = useUserPreferences();

  const boardsQuery = clientApi.board.getAllBoards.useQuery(undefined, { enabled: isAuthenticated });
  const searchEnginesQuery = clientApi.searchEngine.getSelectable.useQuery(undefined, { enabled: isAuthenticated });

  const valueLabelResolvers: Record<string, () => string> = {
    colorScheme: () => tColorScheme(preferences.getPreference("colorScheme").value as ColorScheme),
    locale: () => {
      const val = preferences.getPreference("locale").value;
      return localeConfigurations[val as keyof typeof localeConfigurations]?.name ?? String(val);
    },
    defaultSearchEngineId: () =>
      searchEnginesQuery.data?.find((e) => e.value === preferences.getPreference("defaultSearchEngineId").value)
        ?.label ?? t("searchEngine.none" as never),
    firstDayOfWeek: () => dayjs.weekdays(false)[preferences.getPreference("firstDayOfWeek").value as DayOfWeek] ?? "",
    homeBoardId: () =>
      boardsQuery.data?.find((b) => b.id === preferences.getPreference("homeBoardId").value)?.name ??
      t("board.none" as never),
    mobileHomeBoardId: () =>
      boardsQuery.data?.find((b) => b.id === preferences.getPreference("mobileHomeBoardId").value)?.name ??
      t("board.none" as never),
  };

  return visiblePreferenceDefinitions(isAuthenticated)
    .map((definition): SettingsAction | null => {
      const label = t(`${definition.key}.label` as never);
      const Icon = preferenceIcons[definition.key];

      const matchesSearch = [label, ...definition.aliases].some((v) => v.toLowerCase().includes(normalizedQuery));
      if (!matchesSearch) return null;

      if (definition.kind === "boolean") {
        const pref = preferences.getPreference(definition.key);
        return {
          key: definition.key,
          Component: () => (
            <BooleanRow label={label} Icon={Icon} checked={pref.value as boolean} isPending={pref.isPending} />
          ),
          useInteraction: interaction.javaScript(() => ({
            onSelect: pref.isPending ? () => undefined : () => pref.setValue(!(pref.value as boolean) as never),
            closeSpotlightOnTrigger: false,
          })),
        };
      }

      if (definition.kind === "link") {
        return {
          key: definition.key,
          Component: () => <LinkRow label={label} Icon={Icon} />,
          useInteraction: interaction.link(() => ({ href: `/manage/users/${session?.user.id ?? ""}/general` })),
        };
      }

      if (SELECT_KINDS.has(definition.kind)) {
        const children = preferenceChildrenOptionsByKey[definition.key];
        if (!children) return null;
        return {
          key: definition.key,
          Component: () => (
            <SelectRow label={label} Icon={Icon} valueLabel={valueLabelResolvers[definition.key]?.() ?? ""} />
          ),
          useInteraction: interaction.children(children),
        };
      }

      return null;
    })
    .filter((action): action is SettingsAction => action !== null);
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
