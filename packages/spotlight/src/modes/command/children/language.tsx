import { Group, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { localeAttributes, supportedLanguages } from "@homarr/translation";
import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import { createChildrenOptions } from "../../../lib/children";

export const languageChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: () => {
    const currentLocale = useCurrentLocale();

    return supportedLanguages.map((localeKey) => ({
      key: localeKey,
      component() {
        return (
          <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%">
            <Group wrap="nowrap">
              <span className={`fi fi-${localeAttributes[localeKey].flagIcon}`} style={{ borderRadius: 4 }}></span>
              <Group wrap="nowrap" gap="xs">
                <Text>{localeAttributes[localeKey].name}</Text>
                <Text size="xs" c="dimmed" inherit>
                  ({localeAttributes[localeKey].translatedName})
                </Text>
              </Group>
            </Group>
            {localeKey === currentLocale && <IconCheck color="currentColor" size={24} />}
          </Group>
        );
      },
      useInteraction() {
        const changeLocale = useChangeLocale();

        return { type: "javaScript", onSelect: () => changeLocale(localeKey) };
      },
    }));
  },
  detailComponent: () => (
    <Stack mx="md" my="sm">
      <Text>Select your prefered language</Text>
    </Stack>
  ),
});
