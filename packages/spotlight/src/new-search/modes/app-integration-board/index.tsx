import { Text } from "@mantine/core";

import type { SearchMode } from "../../mode";

export const appIntegrationBoardMode = {
  name: "appIntegrationBoard",
  character: "#",
  help: "Search for apps, integrations and boards",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [],
} satisfies SearchMode;
