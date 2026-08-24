import { Group, Stack, Text } from "@mantine/core";

import { createGroup } from "../../lib/group";
import type { ContextSpecificItem } from "./context";
import { useSpotlightContextResults } from "./context";

export const shouldShowContextSpecificResult = (query: string, option: ContextSpecificItem) => {
  if (option.alwaysVisible) return true;
  if (query.length === 0) return false;
  const normalizedQuery = query.trim().toLowerCase();
  const searchableValues = [option.name, option.description ?? "", ...(option.aliases ?? [])];
  return searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));
};

const localResultSort = (query: string, [first, second]: [ContextSpecificItem, ContextSpecificItem]) => {
  const normalizedQuery = query.trim().toLowerCase();
  const score = (option: ContextSpecificItem) => {
    const normalizedName = option.name.toLowerCase();
    if (normalizedName === normalizedQuery) return 0;
    if (normalizedName.startsWith(normalizedQuery)) return 1;
    return 2;
  };

  return score(first) - score(second);
};

const renderContextSpecificItem = (option: ContextSpecificItem) => {
  const icon =
    typeof option.icon !== "string" ? (
      <option.icon size={24} />
    ) : (
      <img width={24} height={24} src={option.icon} alt="" />
    );

  return (
    <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={option.unavailable ? 0.55 : 1}>
      {icon}
      <Stack gap={0}>
        <Text>{option.name}</Text>
        {option.description ? (
          <Text size="xs" c="dimmed">
            {option.description}
          </Text>
        ) : null}
      </Stack>
    </Group>
  );
};

export const contextSpecificSearchGroups = createGroup<ContextSpecificItem>({
  title: (t) => t("search.mode.home.group.local.title"),
  keyPath: "id",
  source: { kind: "local" },
  Component: renderContextSpecificItem,
  useInteraction(option, query) {
    return option.interaction(query);
  },
  filter: shouldShowContextSpecificResult,
  sort: localResultSort,
  useOptions() {
    return useSpotlightContextResults().filter((item) => item.placement !== "fallback");
  },
});

export const contextSpecificAppsSearchGroup = createGroup<ContextSpecificItem>({
  title: (t) => t("search.mode.home.group.local.title"),
  keyPath: "id",
  source: { kind: "local" },
  Component: renderContextSpecificItem,
  useInteraction(option, query) {
    return option.interaction(query);
  },
  filter(query, option) {
    return query.trim().length === 0 || shouldShowContextSpecificResult(query, option);
  },
  sort: localResultSort,
  useOptions() {
    return useSpotlightContextResults().filter((item) => item.placement !== "fallback");
  },
});

export const contextSpecificFallbackSearchGroup = createGroup<ContextSpecificItem>({
  title: (t) => t("search.modePicker.continueWith"),
  keyPath: "id",
  source: { kind: "fallback" },
  Component: renderContextSpecificItem,
  useInteraction(option, query) {
    return option.interaction(query);
  },
  filter: shouldShowContextSpecificResult,
  sort: localResultSort,
  useOptions() {
    return useSpotlightContextResults().filter((item) => item.placement === "fallback");
  },
});
