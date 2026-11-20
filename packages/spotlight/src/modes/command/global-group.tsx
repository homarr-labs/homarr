import { Group, Text } from "@mantine/core";
import {
  IconBox,
  IconCategoryPlus,
  IconMailForward,
  IconPlug,
  IconPalette,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { interaction } from "../../lib/interaction";
import { newIntegrationChildrenOptions } from "./children/new-integration";
import { themeChildrenOptions } from "./children/theme";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Command<TSearchInteraction extends SearchInteraction = SearchInteraction> = {
  commandKey: string;
  icon: TablerIcon;
  name: string;
  searchTerms?: string[];
  useInteraction: (
    _c: Command<TSearchInteraction>,
    query: string,
  ) => inferSearchInteractionDefinition<TSearchInteraction>;
};

export const globalCommandGroup = createGroup<Command>({
  keyPath: "commandKey",
  title: (t) => t("search.mode.command.group.globalCommand.title"),
  source: { kind: "local" },
  useInteraction: (option, query) => option.useInteraction(option, query),
  Component: ({ icon: Icon, name }) => (
    <Group px="md" py="sm">
      <Icon stroke={1.5} />
      <Text>{name}</Text>
    </Group>
  ),
  filter(query, option) {
    return [option.name, ...(option.searchTerms ?? [])].some((term) =>
      term.toLowerCase().includes(query.toLowerCase()),
    );
  },
  useOptions() {
    const tOption = useI18n("search.mode.command.group.globalCommand.option");
    const tTheme = useI18n("common.customTheme");
    const { data: session } = useSession();

    const commands: (Command & { hidden?: boolean })[] = [
      {
        commandKey: "theme",
        icon: IconPalette,
        name: tTheme("label"),
        searchTerms: Object.values(themeNames),
        useInteraction: interaction.children(themeChildrenOptions),
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        commandKey: "newBoard",
        icon: IconCategoryPlus,
        name: tOption("newBoard.label"),
        useInteraction: interaction.link(() => ({ href: "/manage/boards?create=true" })),
        hidden: !session?.user.permissions.includes("board-create"),
      },
      {
        commandKey: "newApp",
        icon: IconBox,
        name: tOption("newApp.label"),
        useInteraction: interaction.link(() => ({ href: "/manage/apps/new" })),
        hidden: !session?.user.permissions.includes("app-create"),
      },
      {
        commandKey: "newIntegration",
        icon: IconPlug,
        name: tOption("newIntegration.label"),
        useInteraction: interaction.children(newIntegrationChildrenOptions),
        hidden: !session?.user.permissions.includes("integration-create"),
      },
      {
        commandKey: "newUser",
        icon: IconUserPlus,
        name: tOption("newUser.label"),
        useInteraction: interaction.link(() => ({ href: "/manage/users/new" })),
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        commandKey: "newInvite",
        icon: IconMailForward,
        name: tOption("newInvite.label"),
        useInteraction: interaction.link(() => ({ href: "/manage/users/invites?create=true" })),
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        commandKey: "newGroup",
        icon: IconUsersGroup,
        name: tOption("newGroup.label"),
        useInteraction: interaction.link(() => ({ href: "/manage/users/groups?create=true" })),
        hidden: !session?.user.permissions.includes("admin"),
      },
    ];

    return commands.filter((command) => !command.hidden);
  },
});
