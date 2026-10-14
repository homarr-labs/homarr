import { Group, Skeleton, Stack, Switch, Text } from "@mantine/core";
import {
  IconActivity,
  IconCalendarWeek,
  IconCheck,
  IconChevronRight,
  IconClick,
  IconDeviceDesktop,
  IconExternalLink,
  IconHome,
  IconLanguage,
  IconLayoutBoard,
  IconRulerMeasure,
  IconSearch,
  IconSettings,
  IconWorldWww,
} from "@tabler/icons-react";

import type { SearchPreference, SearchPreferenceKey, SearchPreferenceValue } from "../../features/search/contracts";
import { SearchResultAction } from "./palette";

const definitions = [
  {
    key: "colorScheme",
    label: "Color scheme",
    guest: true,
    Icon: IconDeviceDesktop,
    aliases: ["theme", "dark", "light", "auto"],
  },
  { key: "locale", label: "Language", guest: true, Icon: IconLanguage, aliases: ["language", "translation"] },
  {
    key: "defaultSearchEngineId",
    label: "Default search engine",
    guest: false,
    Icon: IconSearch,
    aliases: ["search", "search engine"],
  },
  {
    key: "openSearchInNewTab",
    label: "Open search in a new tab",
    guest: false,
    Icon: IconExternalLink,
    aliases: ["search", "new tab", "external"],
  },
  {
    key: "ddgBangs",
    label: "DuckDuckGo bangs",
    guest: false,
    Icon: IconWorldWww,
    aliases: ["duckduckgo", "bangs", "search"],
  },
  {
    key: "firstDayOfWeek",
    label: "First day of the week",
    guest: false,
    Icon: IconCalendarWeek,
    aliases: ["calendar", "week", "weekday"],
  },
  {
    key: "byteUnitSystem",
    label: "Byte unit system",
    guest: false,
    Icon: IconRulerMeasure,
    aliases: ["data", "size", "storage", "unit", "binary", "decimal", "GB", "GiB"],
  },
  { key: "homeBoardId", label: "Home board", guest: false, Icon: IconHome, aliases: ["home", "board", "dashboard"] },
  {
    key: "mobileHomeBoardId",
    label: "Mobile home board",
    guest: false,
    Icon: IconLayoutBoard,
    aliases: ["mobile", "home", "board", "dashboard"],
  },
  {
    key: "pingIconsEnabled",
    label: "Ping icons",
    guest: false,
    Icon: IconActivity,
    aliases: ["ping", "icon", "status"],
  },
  {
    key: "enableRightClickOnWidgets",
    label: "Right click on widgets",
    guest: false,
    Icon: IconClick,
    aliases: ["right click", "context menu", "tile", "widget menu"],
  },
  {
    key: "fullPreferencesPage",
    label: "All preferences",
    guest: false,
    Icon: IconSettings,
    aliases: ["settings", "manage", "profile"],
  },
] as const;

export interface SearchPreferenceResultsProps {
  preferences: readonly SearchPreference[];
  authenticated: boolean;
  query: string;
  selectedKey: SearchPreferenceKey | null;
  pendingKey: SearchPreferenceKey | null;
  current: boolean;
  onOpen(key: SearchPreferenceKey): void;
  onSelect(key: SearchPreferenceKey, value: SearchPreferenceValue | boolean): void;
}

export function hasSearchPreferenceResults(
  preferences: readonly SearchPreference[],
  authenticated: boolean,
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  return definitions.some((definition) => {
    if (!definition.guest && !authenticated) return false;
    const label = preferences.find((preference) => preference.key === definition.key)?.label ?? definition.label;
    return [label, ...definition.aliases].some((value) => value.toLowerCase().includes(normalized));
  });
}

export function SearchPreferenceResults({
  preferences,
  authenticated,
  query,
  selectedKey,
  pendingKey,
  current,
  onOpen,
  onSelect,
}: SearchPreferenceResultsProps) {
  const normalized = query.trim().toLowerCase();
  const selected = preferences.find((preference) => preference.key === selectedKey);
  if (selected?.kind === "select") {
    if (selected.loading)
      return (
        <Stack px="md" py="sm" aria-label="Loading preference choices">
          <Skeleton h={32} />
          <Skeleton h={32} />
        </Stack>
      );
    if (selected.error)
      return (
        <Text role="alert" px="md" py="sm">
          {selected.error}
        </Text>
      );
    const choices = selected.choices.filter((choice) => choice.label.toLowerCase().includes(normalized));
    return (
      <>
        {choices.map((choice) => {
          const disabled =
            !current || pendingKey !== null || selected.writer.kind === "held" || Boolean(choice.unavailable);
          return (
            <SearchResultAction
              key={choice.key}
              actionKey={`preference:${selected.key}:${choice.key}`}
              disabled={disabled}
              onSelect={() => onSelect(selected.key, choice.value)}
            >
              <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%" opacity={pendingKey ? 0.5 : 1}>
                <Stack gap={2}>
                  <Text>{choice.label}</Text>
                  {choice.unavailable && <Text size="xs">{choice.unavailable}</Text>}
                </Stack>
                {selected.value === choice.value && <IconCheck color="currentColor" size={24} />}
              </Group>
            </SearchResultAction>
          );
        })}
        {choices.length === 0 && (
          <Text px="md" py="sm">
            No matching choices. Try another query.
          </Text>
        )}
        {selected.writer.kind === "held" && (
          <Text component="output" px="md" py="sm">
            {selected.writer.reason}
          </Text>
        )}
      </>
    );
  }
  if (!hasSearchPreferenceResults(preferences, authenticated, query))
    return (
      <Text px="md" py="sm">
        No matching preferences. Try another query.
      </Text>
    );
  return (
    <>
      {definitions
        .filter((definition) => definition.guest || authenticated)
        .map((definition) => {
          const preference = preferences.find((entry) => entry.key === definition.key);
          const label = preference?.label ?? definition.label;
          if (![label, ...definition.aliases].some((value) => value.toLowerCase().includes(normalized))) return null;
          const Icon = definition.Icon;
          let unavailable: string | undefined;
          if (!preference) unavailable = "Preference acquisition and persistence are unavailable in this host.";
          else if (preference.kind === "link") unavailable = preference.unavailable;
          else if (preference.writer.kind === "held") unavailable = preference.writer.reason;
          const disabled =
            !current ||
            pendingKey !== null ||
            (Boolean(unavailable) && preference?.kind !== "select") ||
            (preference?.kind === "link" && preference.action.kind === "none");
          return (
            <SearchResultAction
              key={definition.key}
              actionKey={`preference:${definition.key}`}
              disabled={disabled}
              onSelect={() => {
                if (preference?.kind === "boolean") onSelect(preference.key, !preference.value);
                else onOpen(definition.key);
              }}
            >
              <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%">
                <Group wrap="nowrap" gap="sm">
                  <Icon stroke={1.5} size={20} />
                  <Stack gap={2}>
                    <Text>{label}</Text>
                    {unavailable && <Text size="xs">{unavailable}</Text>}
                  </Stack>
                </Group>
                {preference?.kind === "boolean" && (
                  <Switch
                    checked={preference.value}
                    readOnly
                    size="md"
                    disabled={disabled}
                    tabIndex={-1}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {preference?.kind === "select" && (
                  <Text size="sm" c="dimmed">
                    {preference.valueLabel ??
                      preference.choices.find((choice) => choice.value === preference.value)?.label}
                  </Text>
                )}
                {preference?.kind !== "boolean" && <IconChevronRight aria-hidden size={16} />}
              </Group>
            </SearchResultAction>
          );
        })}
    </>
  );
}
