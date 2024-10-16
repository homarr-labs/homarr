import { Group, Text, useMantineColorScheme } from "@mantine/core";
import {
  IconCategoryPlus,
  IconFileImport,
  IconLanguage,
  IconMailForward,
  IconMoon,
  IconPackage,
  IconPlug,
  IconSun,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { AddBoardModal, AddGroupModal, ImportBoardModal, InviteCreateModal } from "@homarr/modals-collection";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { interaction } from "../../lib/interaction";
import type { SearchMode } from "../../lib/mode";
import { languageChildrenOptions } from "./children/language";
import { newIntegrationChildrenOptions } from "./children/new-integration";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Command<TSearchInteraction extends SearchInteraction = SearchInteraction> = {
  commandKey: string;
  icon: TablerIcon;
  name: string;
  useInteraction: (
    _c: Command<TSearchInteraction>,
    query: string,
  ) => inferSearchInteractionDefinition<TSearchInteraction>;
};

export const commandMode = {
  modeKey: "command",
  character: ">",
  groups: [
    createGroup<Command>({
      keyPath: "commandKey",
      title: "Global commands",
      useInteraction: (option, query) => option.useInteraction(option, query),
      Component: ({ icon: Icon, name }) => (
        <Group px="md" py="sm">
          <Icon stroke={1.5} />
          <Text>{name}</Text>
        </Group>
      ),
      filter(query, option) {
        return option.name.toLowerCase().includes(query.toLowerCase());
      },
      useOptions() {
        const tOption = useScopedI18n("search.mode.command.group.globalCommand.option");
        const { colorScheme } = useMantineColorScheme();

        const commands: (Command & { hidden?: boolean })[] = [
          {
            commandKey: "colorScheme",
            icon: colorScheme === "dark" ? IconSun : IconMoon,
            name: tOption(`colorScheme.${colorScheme === "dark" ? "light" : "dark"}`),
            useInteraction: () => {
              const { toggleColorScheme } = useMantineColorScheme();

              return {
                type: "javaScript",
                onSelect: toggleColorScheme,
              };
            },
          },
          {
            commandKey: "language",
            icon: IconLanguage,
            name: tOption("language.label"),
            useInteraction: interaction.children(languageChildrenOptions),
          },
          {
            commandKey: "newBoard",
            icon: IconCategoryPlus,
            name: tOption("newBoard.label"),
            useInteraction() {
              const { openModal } = useModalAction(AddBoardModal);

              return {
                type: "javaScript",
                onSelect() {
                  openModal(undefined);
                },
              };
            },
          },
          {
            commandKey: "importBoard",
            icon: IconFileImport,
            name: tOption("importBoard.label"),
            useInteraction() {
              const { openModal } = useModalAction(ImportBoardModal);

              return {
                type: "javaScript",
                onSelect() {
                  openModal(undefined);
                },
              };
            },
          },
          {
            commandKey: "newApp",
            icon: IconPackage,
            name: tOption("newApp.label"),
            useInteraction: interaction.link(() => ({ href: "/manage/apps/new" })),
          },
          {
            commandKey: "newIntegration",
            icon: IconPlug,
            name: tOption("newIntegration.label"),
            useInteraction: interaction.children(newIntegrationChildrenOptions),
          },
          {
            commandKey: "newUser",
            icon: IconUserPlus,
            name: tOption("newUser.label"),
            useInteraction: interaction.link(() => ({ href: "/manage/users/new" })),
          },
          {
            commandKey: "newInvite",
            icon: IconMailForward,
            name: tOption("newInvite.label"),
            useInteraction() {
              const { openModal } = useModalAction(InviteCreateModal);

              return {
                type: "javaScript",
                onSelect() {
                  openModal(undefined);
                },
              };
            },
          },
          {
            commandKey: "newGroup",
            icon: IconUsersGroup,
            name: tOption("newGroup.label"),
            useInteraction() {
              const { openModal } = useModalAction(AddGroupModal);

              return {
                type: "javaScript",
                onSelect() {
                  openModal(undefined);
                },
              };
            },
          },
        ];

        return commands.filter((command) => !command.hidden);
      },
    }),
  ],
} satisfies SearchMode;
