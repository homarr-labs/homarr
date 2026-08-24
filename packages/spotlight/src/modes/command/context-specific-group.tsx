import { Group, Stack, Text } from "@mantine/core";

import { createGroup } from "../../lib/group";
import type { ContextSpecificItem } from "../home/context";
import { useSpotlightContextActions } from "../home/context";

export const contextSpecificActionsSearchGroups = createGroup<ContextSpecificItem>({
  title: (t) => t("search.mode.command.group.localCommand.title"),
  keyPath: "id",
  source: { kind: "local" },
  Component(option) {
    const icon =
      typeof option.icon !== "string" ? (
        <option.icon size={24} />
      ) : (
        <img width={24} height={24} src={option.icon} alt={option.name} />
      );

    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={option.unavailable ? 0.55 : 1}>
        {icon}
        <Stack gap={0}>
          <Text>{option.name}</Text>
          {option.description && (
            <Text size="xs" c="dimmed">
              {option.description}
            </Text>
          )}
        </Stack>
      </Group>
    );
  },
  useInteraction(option, query) {
    return option.interaction(query);
  },
  filter(query, option) {
    return option.name.toLowerCase().includes(query.toLowerCase());
  },
  useOptions() {
    return useSpotlightContextActions();
  },
});
