import { Text } from "@mantine/core";

import type { SearchMode } from "../../lib/mode";
import { searchEnginesSearchGroups } from "./search-engines-search-group";

export const externalMode = {
  name: "external",
  character: "!",
  help: "Use an external search engine",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [searchEnginesSearchGroups],
} satisfies SearchMode;
