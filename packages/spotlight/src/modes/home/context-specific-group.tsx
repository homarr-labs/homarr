import { Group, Stack, Text } from "@mantine/core";

import { createGroup } from "../../lib/group";
import type { ContextSpecificItem } from "./context";
import { useSpotlightContextResults } from "./context";

export const shouldShowContextSpecificResult = (query: string, option: ContextSpecificItem) => {
  if (option.alwaysVisible) return true;
  if (query.length === 0) return false;
  return option.name.toLowerCase().includes(query.toLowerCase());
};

export const contextSpecificSearchGroups = createGroup<ContextSpecificItem>({
  title: (t) => t("search.mode.home.group.local.title"),
  keyPath: "id",
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
  filter: shouldShowContextSpecificResult,
  useOptions() {
    return useSpotlightContextResults();
  },
});
