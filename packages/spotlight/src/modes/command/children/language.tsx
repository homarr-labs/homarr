import { Group, Text } from "@mantine/core";

import { localeConfigurations, supportedLanguages } from "@homarr/translation";
import { useUserPreference } from "../../../preferences/use-user-preference";
import { LanguageIcon } from "@homarr/ui";

import { createChildrenOptions } from "../../../lib/children";
import { createCheckmarkPreferenceAction, PreferenceDetailHeader } from "./preferences/action-row";

export const languageChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: (_, query) => {
    const normalizedQuery = query.trim().toLowerCase();
    const { value: currentLocale, setValue: setLocale, isPending } = useUserPreference("locale");

    return supportedLanguages
      .map((localeKey) => ({ localeKey, configuration: localeConfigurations[localeKey] }))
      .filter(
        ({ configuration }) =>
          configuration.name.toLowerCase().includes(normalizedQuery) ||
          configuration.translatedName.toLowerCase().includes(normalizedQuery),
      )
      .toSorted(
        (languageA, languageB) =>
          Math.min(
            languageA.configuration.name.toLowerCase().indexOf(normalizedQuery),
            languageA.configuration.translatedName.toLowerCase().indexOf(normalizedQuery),
          ) -
          Math.min(
            languageB.configuration.name.toLowerCase().indexOf(normalizedQuery),
            languageB.configuration.translatedName.toLowerCase().indexOf(normalizedQuery),
          ),
      )
      .map(({ localeKey, configuration }) =>
        createCheckmarkPreferenceAction({
          key: localeKey,
          isSelected: localeKey === currentLocale,
          onSelect: () => setLocale(localeKey as never),
          isPending,
          labelContent: (
            <Group wrap="nowrap">
              <LanguageIcon icon={localeConfigurations[localeKey].icon} />
              <Group wrap="nowrap" gap="xs">
                <Text>{configuration.name}</Text>
                <Text size="xs" c="dimmed" inherit>
                  ({configuration.translatedName})
                </Text>
              </Group>
            </Group>
          ),
        }),
      );
  },
  DetailComponent: () => <PreferenceDetailHeader titleKey="locale.children.detail.title" />,
});
