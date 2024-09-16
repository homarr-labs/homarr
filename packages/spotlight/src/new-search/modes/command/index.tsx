import { Group, Text, useMantineColorScheme } from "@mantine/core";
import { IconLanguage, IconMoon, IconSun } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";
import { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../group";
import { inferSearchInteractionDefinition, interaction, SearchInteraction } from "../../interaction";
import type { SearchMode } from "../../mode";
import { languageChildrenOptions } from "./children/language";

type Command<TSearchInteraction extends SearchInteraction = SearchInteraction> = {
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
        const session = useSession();
        const t = useI18n();
        const { colorScheme, toggleColorScheme } = useMantineColorScheme();

        const commands: (Command & { hidden?: boolean })[] = [
          {
            icon: colorScheme === "dark" ? IconSun : IconMoon,
            name: t(`common.userAvatar.menu.switchTo${colorScheme === "dark" ? "Light" : "Dark"}Mode`),
            useInteraction: interaction.javaScript(() => ({
              onSelect() {
                toggleColorScheme();
              },
            })),
          },
          {
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
