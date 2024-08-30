import { Text } from "@mantine/core";

import type { SearchMode } from "../../mode";

export const commandMode = {
  name: "command",
  character: ">",
  help: "Activate command mode",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [],
} satisfies SearchMode;
