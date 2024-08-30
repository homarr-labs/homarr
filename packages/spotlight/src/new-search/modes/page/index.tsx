import { Text } from "@mantine/core";

import type { SearchMode } from "../../mode";

export const pageMode = {
  name: "page",
  character: "/",
  help: "Search for pages",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [],
} satisfies SearchMode;
