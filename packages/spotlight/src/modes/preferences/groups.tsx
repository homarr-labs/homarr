import { Group, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { colorSchemes } from "@homarr/definitions";
import { visiblePreferenceDefinitions } from "@homarr/settings";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { preferenceChildrenOptionsByKey, preferenceIcons } from "../../preferences/preference-registry";
import { settingsChildrenOptions } from "../command/children/preferences/settings-children";

type PreferencesGroupOption = { key: "settings"; preferenceKey: null } | { key: string; preferenceKey: string };

const settingsOption: PreferencesGroupOption = { key: "settings", preferenceKey: null };

export const preferencesGroup = createGroup<PreferencesGroupOption>({
  keyPath: "key",
  title: (t) => t("search.mode.command.group.preferences.title"),
  useOptions(query) {
    const t = useI18n();
    const tColorScheme = useScopedI18n("common.colorScheme.options");
    const { data: session } = useSession();
    const definitions = visiblePreferenceDefinitions(Boolean(session?.user));
    const q = query.trim().toLowerCase();

    if (q.length === 0) return [settingsOption];

    const matching = definitions.flatMap((def): PreferencesGroupOption[] => {
      if (!preferenceChildrenOptionsByKey[def.key]) return [];
      const label = t(`search.mode.command.group.preferences.option.${def.key}.label` as never);
      const searchValues = [
        label,
        ...def.aliases,
        ...(def.key === "colorScheme" ? colorSchemes.map((s) => tColorScheme(s)) : []),
      ];
      if (!searchValues.some((v) => v.toLowerCase().includes(q))) return [];
      return [{ key: def.key, preferenceKey: def.key }];
    });

    if (matching.length > 0) return matching;

    const allSearchValues = [
      t("search.mode.command.group.preferences.title"),
      ...definitions.flatMap((d) => d.aliases),
    ];
    return allSearchValues.some((v) => v.toLowerCase().includes(q)) ? [settingsOption] : [];
  },
  Component: (option) => {
    const t = useScopedI18n("search.mode.command.group.preferences");
    const tOption = useScopedI18n("search.mode.command.group.preferences.option");
    const Icon = option.preferenceKey
      ? preferenceIcons[option.preferenceKey as keyof typeof preferenceIcons]
      : IconSettings;
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
    ...(option.preferenceKey
      ? (preferenceChildrenOptionsByKey[option.preferenceKey as keyof typeof preferenceChildrenOptionsByKey]?.({}) ??
        settingsChildrenOptions({}))
      : settingsChildrenOptions({})),
  }),
});
