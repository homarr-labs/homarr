import { Group, Kbd, Text } from "@mantine/core";

import { createGroup } from "../group";
import { interaction } from "../interaction";
import type { SearchMode } from "../mode";
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
      title: "Modes",
      options: searchModesWithoutHelp.map(({ character, name, help }) => ({ character, name, help })),
      component: ({ help, character }) => (
        <Group px="md" py="xs" w="100%" wrap="nowrap" align="center" justify="space-between">
          <Text>{help}</Text>
          <Kbd size="sm">{character}</Kbd>
        </Group>
      ),
      filter: () => true,
      interaction: interaction.mode(({ name }) => ({ mode: name })),
    }),
  ],
} satisfies SearchMode;

export const searchModes = [...searchModesWithoutHelp, helpMode] as const;
