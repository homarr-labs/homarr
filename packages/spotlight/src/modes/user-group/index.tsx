import { Text } from "@mantine/core";

import type { SearchMode } from "../../lib/mode";
import { groupsSearchGroup } from "./groups-search-group";
import { usersSearchGroup } from "./users-search-group";

export const userGroupMode = {
  name: "userGroup",
  character: "@",
  help: "Search for users and groups",
  tip: (
    <Text size="xs" c="gray.6">
      TODO: Add tip
    </Text>
  ),
  groups: [usersSearchGroup, groupsSearchGroup],
} satisfies SearchMode;
