import { Group, Text, useMantineColorScheme } from "@mantine/core";
import { IconLanguage, IconMoon, IconSun } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { interaction } from "../../lib/interaction";
import type { SearchMode } from "../../lib/mode";
import { languageChildrenOptions } from "./children/language";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Command<TSearchInteraction extends SearchInteraction = SearchInteraction> = {
  key: string;
  icon: TablerIcon;
  name: string;
  useInteraction: (
    _c: Command<TSearchInteraction>,
    query: string,
  ) => inferSearchInteractionDefinition<TSearchInteraction>;
};

export const commandMode = {
  name: "command",
  character: ">",
  help: "Activate command mode",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [
    createGroup<Command>({
      keyPath: "key",
      title: "Global commands",
      useInteraction: (option, query) => option.useInteraction(option, query),
      component: ({ icon: Icon, name }) => (
        <Group px="md" py="sm">
          <Icon stroke={1.5} />
          <Text>{name}</Text>
        </Group>
      ),
      filter(query, option) {
        return option.name.toLowerCase().includes(query.toLowerCase());
      },
      useOptions() {
        const t = useI18n();
        const { colorScheme, toggleColorScheme } = useMantineColorScheme();

        const commands: (Command & { hidden?: boolean })[] = [
          {
            key: "color-scheme",
            icon: colorScheme === "dark" ? IconSun : IconMoon,
            name: t(`common.userAvatar.menu.switchTo${colorScheme === "dark" ? "Light" : "Dark"}Mode`),
            useInteraction: interaction.javaScript(() => ({
              onSelect() {
                toggleColorScheme();
              },
            })),
          },
          {
            key: "language",
            icon: IconLanguage,
            name: "Change language",
            useInteraction: interaction.children(languageChildrenOptions),
          },
        ];

        return commands.filter((command) => !command.hidden);
      },
    }),
  ],
} satisfies SearchMode;
