import { Text } from "@mantine/core";

import type { SearchMode } from "../../mode";
import { pagesSearchGroup } from "./pages-search-group";

export const pageMode = {
  name: "page",
  character: "/",
  help: "Search for pages",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [pagesSearchGroup],
} satisfies SearchMode;
