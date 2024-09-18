import { Group, Kbd, Text } from "@mantine/core";
import { IconBook2, IconBrandDiscord, IconBrandGithub } from "@tabler/icons-react";

import { createGroup } from "../lib/group";
import { interaction } from "../lib/interaction";
import type { SearchMode } from "../lib/mode";
import { appIntegrationBoardMode } from "./app-integration-board";
import { commandMode } from "./command";
import { externalMode } from "./external";
import { pageMode } from "./page";
import { userGroupMode } from "./user-group";

const searchModesWithoutHelp = [userGroupMode, appIntegrationBoardMode, externalMode, commandMode, pageMode] as const;

const helpMode = {
  name: "help",
  character: "?",
  help: undefined,
  tip: (
    <Text size="xs" c="gray.6">
      Type <Kbd size="xs">⌫</Kbd> to go back
    </Text>
  ),
  groups: [
    createGroup({
      keyPath: "character",
      title: "Modes",
      options: searchModesWithoutHelp.map(({ character, name, help }) => ({ character, name, help })),
      component: ({ help, character }) => (
        <Group px="md" py="xs" w="100%" wrap="nowrap" align="center" justify="space-between">
          <Text>{help}</Text>
          <Kbd size="sm">{character}</Kbd>
        </Group>
      ),
      filter: () => true,
      useInteraction: interaction.mode(({ name }) => ({ mode: name })),
    }),
    createGroup({
      keyPath: "href",
      title: "Help",
      options: [
        {
          label: "Documentation",
          icon: IconBook2,
          href: "https://homarr.dev/docs/getting-started/",
        },
        {
          label: "Submit an issue",
          icon: IconBrandGithub,
          href: "https://github.com/ajnart/homarr/issues/new/choose",
        },
        {
          label: "Community Discord",
          icon: IconBrandDiscord,
          href: "https://discord.com/invite/aCsmEV5RgA",
        },
      ],
      component: (props) => (
        <Group px="md" py="xs" w="100%" wrap="nowrap" align="center">
          <props.icon />
          <Text>{props.label}</Text>
        </Group>
      ),
      filter: () => true,
      useInteraction: interaction.link(({ href }) => ({ href })),
    }),
  ],
} satisfies SearchMode;

export const searchModes = [...searchModesWithoutHelp, helpMode] as const;
