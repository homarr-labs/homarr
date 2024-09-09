import { Text } from "@mantine/core";

import type { SearchMode } from "../../mode";
import { appsSearchGroup } from "./apps-search-group";
import { boardsSearchGroup } from "./boards-search-group";
import { integrationsSearchGroup } from "./integrations-search-group";

export const appIntegrationBoardMode = {
  name: "appIntegrationBoard",
  character: "#",
  help: "Search for apps, integrations and boards",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [appsSearchGroup, integrationsSearchGroup, boardsSearchGroup],
} satisfies SearchMode;
