import { Group, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { colorSchemes } from "@homarr/definitions";
import { userPreferenceDefinitions } from "@homarr/settings";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { preferenceChildrenOptionsByKey, preferenceIcons } from "../command/children/preferences/registry";
import { settingsChildrenOptions } from "../command/children/preferences/settings-children";

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

type PreferenceChildKey = Extract<keyof typeof preferenceChildrenOptionsByKey, string>;

type PreferencesGroupOption =
  | {
      key: "settings";
      preferenceKey: null;
    }
  | {
      key: PreferenceChildKey;
      preferenceKey: PreferenceChildKey;
    };

const settingsOption = { key: "settings", preferenceKey: null } satisfies PreferencesGroupOption;

export const preferencesGroup = createGroup<PreferencesGroupOption>({
  keyPath: "key",
  title: (t) => t("search.mode.command.group.preferences.title"),
  useOptions(query) {
    const t = useI18n();
    const tColorScheme = useScopedI18n("common.colorScheme.options");
    const { data: session } = useSession();
    const isAuthenticated = Boolean(session?.user);
    const visibleDefinitions = userPreferenceDefinitions.filter((definition) => definition.guest || isAuthenticated);
    const normalizedQuery = normalizeSearchValue(query);
    if (normalizedQuery.length === 0) return [settingsOption];

    const settingsSearchValues = [
      t("search.mode.command.group.preferences.title"),
      ...visibleDefinitions.flatMap((definition) => definition.aliases),
    ];

    const matchingPreferenceOptions = visibleDefinitions.flatMap((definition): PreferencesGroupOption[] => {
      const label = t(`search.mode.command.group.preferences.option.${definition.key}.label` as never);
      const searchValues = [
        label,
        ...definition.aliases,
        ...(definition.key === "colorScheme" ? colorSchemes.map((scheme) => tColorScheme(scheme)) : []),
      ];
      if (!searchValues.some((value) => normalizeSearchValue(value).includes(normalizedQuery))) return [];
      if (!(definition.key in preferenceChildrenOptionsByKey)) return [];
      const preferenceKey = definition.key as PreferenceChildKey;

      return [{ key: preferenceKey, preferenceKey }];
    });

    if (matchingPreferenceOptions.length > 0) return matchingPreferenceOptions;

    return settingsSearchValues.some((value) => normalizeSearchValue(value).includes(normalizedQuery))
      ? [settingsOption]
      : [];
  },
  Component: (option) => {
    const t = useScopedI18n("search.mode.command.group.preferences");
    const tOption = useScopedI18n("search.mode.command.group.preferences.option");
    const Icon = option.preferenceKey ? preferenceIcons[option.preferenceKey] : IconSettings;
    const label = option.preferenceKey ? tOption(`${option.preferenceKey}.label` as never) : t("title");

    return (
      <Group px="md" py="sm" wrap="nowrap" gap="sm">
        <Icon stroke={1.5} />
        <Text>{label}</Text>
      </Group>
    );
  },
  filter: () => true,
  useInteraction: (option) => ({
    type: "children",
    ...(option.preferenceKey ? preferenceChildrenOptionsByKey[option.preferenceKey]({}) : settingsChildrenOptions({})),
  }),
});
