import { Group, Kbd, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import {
  IconApps,
  IconCommand,
  IconMovie,
  IconRobot,
  IconSearch,
  IconSettings,
  IconUsers,
  IconWorldSearch,
} from "@tabler/icons-react";

import type { SpotlightMode } from "../open";
import classes from "./spotlight.module.css";

export interface RuntimeModeRailEntry {
  ariaLabel: string;
  character?: string;
  label: string;
  placeholder: string;
  mode: SpotlightMode;
}

export const runtimeSearchModes: readonly RuntimeModeRailEntry[] = [
  { mode: "search", character: "/", label: "Search", ariaLabel: "Search mode", placeholder: "Search Homarr" },
  {
    mode: "apps",
    character: "#",
    label: "Apps",
    ariaLabel: "Apps mode",
    placeholder: "Search apps, integrations and boards",
  },
  {
    mode: "command",
    character: ">",
    label: "Commands",
    ariaLabel: "Commands mode",
    placeholder: "Search commands and pages",
  },
  {
    mode: "preferences",
    character: "?",
    label: "Preferences",
    ariaLabel: "Preferences mode",
    placeholder: "Search preferences",
  },
  { mode: "assistant", label: "Assistant", ariaLabel: "Assistant mode", placeholder: "Ask the assistant" },
  {
    mode: "external",
    character: "!",
    label: "Web",
    ariaLabel: "Web search mode",
    placeholder: "Select an engine or type a bang",
  },
  { mode: "media", label: "Media", ariaLabel: "Media mode", placeholder: "Search for movies and series" },
  {
    mode: "userGroup",
    character: "@",
    label: "Users and groups",
    ariaLabel: "Users and groups mode",
    placeholder: "Search users and groups",
  },
];

const modeIcons: Record<SpotlightMode, typeof IconSearch> = {
  search: IconSearch,
  apps: IconApps,
  command: IconCommand,
  preferences: IconSettings,
  assistant: IconRobot,
  external: IconWorldSearch,
  media: IconMovie,
  userGroup: IconUsers,
};

export interface RuntimeSpotlightModeRailProps {
  activeMode: SpotlightMode | "bookmarks";
  entries?: readonly RuntimeModeRailEntry[];
  canManageUsers: boolean;
  interactionBlocked?: boolean;
  navigationLabel?: string;
  onModeChange(mode: SpotlightMode): void;
}

export function RuntimeSpotlightModeRail({
  activeMode,
  entries = runtimeSearchModes,
  canManageUsers,
  interactionBlocked = false,
  navigationLabel = "Search modes",
  onModeChange,
}: RuntimeSpotlightModeRailProps) {
  return (
    <ScrollArea type="never" scrollbarSize={0} className={classes.modeRailViewport}>
      <Group component="nav" aria-label={navigationLabel} wrap="nowrap" gap={4} className={classes.modeRail}>
        {entries.map((entry) => {
          if (entry.mode === "userGroup" && !canManageUsers) return null;
          const Icon = modeIcons[entry.mode];
          const active = entry.mode === activeMode;
          return (
            <UnstyledButton
              type="button"
              key={entry.mode}
              className={classes.modeButton}
              data-active={active || undefined}
              aria-pressed={active}
              aria-label={entry.ariaLabel}
              onClick={() => onModeChange(entry.mode)}
              disabled={interactionBlocked}
            >
              <Icon size={15} stroke={1.7} />
              <Text component="span" size="xs" fw={600} className={classes.modeLabel}>
                {entry.label}
              </Text>
              {entry.character && (
                <Kbd size="xs" className={classes.modeKey}>
                  {entry.character}
                </Kbd>
              )}
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
