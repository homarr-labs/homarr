import { Group, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { localeAttributes, supportedLanguages } from "@homarr/translation";
import { useChangeLocale, useCurrentLocale, useI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../../lib/children";

export const languageChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: (_, query) => {
    const normalizedQuery = query.trim().toLowerCase();
    const currentLocale = useCurrentLocale();
    return supportedLanguages
      .map((localeKey) => ({ localeKey, attributes: localeAttributes[localeKey] }))
      .filter(
        ({ attributes }) =>
          attributes.name.toLowerCase().includes(normalizedQuery) ||
          attributes.translatedName.toLowerCase().includes(normalizedQuery),
      )
      .sort(
        (languageA, languageB) =>
          Math.min(
            languageA.attributes.name.toLowerCase().indexOf(normalizedQuery),
            languageA.attributes.translatedName.toLowerCase().indexOf(normalizedQuery),
          ) -
          Math.min(
            languageB.attributes.name.toLowerCase().indexOf(normalizedQuery),
            languageB.attributes.translatedName.toLowerCase().indexOf(normalizedQuery),
          ),
      )
      .map(({ localeKey, attributes }) => ({
        key: localeKey,
        Component() {
          return (
            <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%">
              <Group wrap="nowrap">
                <span className={`fi fi-${attributes.flagIcon}`} style={{ borderRadius: 4 }}></span>
                <Group wrap="nowrap" gap="xs">
                  <Text>{attributes.name}</Text>
                  <Text size="xs" c="dimmed" inherit>
                    ({attributes.translatedName})
                  </Text>
                </Group>
              </Group>
              {localeKey === currentLocale && <IconCheck color="currentColor" size={24} />}
            </Group>
          );
        },
        useInteraction() {
          const { changeLocale } = useChangeLocale();

          return { type: "javaScript", onSelect: () => changeLocale(localeKey) };
        },
      }));
  },
  DetailComponent: () => {
    const t = useI18n();

    return (
      <Stack mx="md" my="sm">
        <Text>{t("search.mode.command.group.globalCommand.option.language.children.detail.title")}</Text>
      </Stack>
    );
  },
});
