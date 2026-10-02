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

import { useSession } from "@homarr/auth/client";

import type { SpotlightMode } from "../open";
import classes from "./spotlight.module.css";

interface ModeRailEntry {
  ariaLabel: string;
  character?: string;
  label: string;
  mode: SpotlightMode;
}

interface SpotlightModeRailProps {
  activeMode: SpotlightMode;
  entries: ModeRailEntry[];
  navigationLabel: string;
  onModeChange: (mode: SpotlightMode) => void;
}

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

export const SpotlightModeRail = ({ activeMode, entries, navigationLabel, onModeChange }: SpotlightModeRailProps) => {
  const { data: session } = useSession();
  const canManageUsers = session?.user.permissions.includes("admin") ?? false;

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
            >
              <Icon size={15} stroke={1.7} />
              <Text component="span" size="xs" fw={600} className={classes.modeLabel}>
                {entry.label}
              </Text>
              {entry.character ? (
                <Kbd size="xs" className={classes.modeKey}>
                  {entry.character}
                </Kbd>
              ) : null}
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
};
