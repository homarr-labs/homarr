"use client";

import { useEffect, useState } from "react";
import { Box, Group, Loader, Paper, Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import {
  IconCheck,
  IconDatabaseImport,
  IconFileZip,
  IconKey,
  IconLoader,
  IconRefresh,
  IconTransform,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { RESTORE_PHASES } from "./types";

const PHASE_ICONS = {
  extracting: IconFileZip,
  migrating: IconDatabaseImport,
  encrypting: IconKey,
  swapping: IconTransform,
  restarting: IconRefresh,
} as const;

const PHASE_DURATIONS = {
  extracting: 1200,
  migrating: 2000,
  encrypting: 1500,
  swapping: 800,
  restarting: 10000,
} as const;

interface RestoreProgressPanelProps {
  active: boolean;
  onComplete?: () => void;
}

export const RestoreProgressPanel = ({ active, onComplete }: RestoreProgressPanelProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore.progress");
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(-1);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < RESTORE_PHASES.length; i++) {
        if (cancelled) return;
        setCurrentPhaseIdx(i);
        const phase = RESTORE_PHASES[i]!;
        const duration = PHASE_DURATIONS[phase];
        if (duration > 0) {
          await new Promise((r) => setTimeout(r, duration + Math.random() * 500));
        }
      }
      if (!cancelled) {
        onComplete?.();
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [active, onComplete]);

  if (!active && currentPhaseIdx === -1) return null;

  return (
    <Paper p="lg" radius="md" bg="var(--mantine-color-dark-7)">
      <Stack gap="md">
        <Group gap="xs">
          <Loader size="sm" color="blue" />
          <Text size="sm" fw={600}>
            {t("title")}
          </Text>
        </Group>

        <Box pl={4}>
          <Timeline
            active={currentPhaseIdx}
            bulletSize={24}
            lineWidth={2}
            color="blue"
          >
            {RESTORE_PHASES.map((phase, i) => {
              const Icon = PHASE_ICONS[phase];
              const isDone = i < currentPhaseIdx;
              const isActive = i === currentPhaseIdx;

              return (
                <Timeline.Item
                  key={phase}
                  bullet={
                    isDone ? (
                      <ThemeIcon size={24} radius="xl" color="green" variant="filled">
                        <IconCheck size={14} />
                      </ThemeIcon>
                    ) : isActive ? (
                      <ThemeIcon size={24} radius="xl" color="blue" variant="filled">
                        <Loader size={12} color="white" />
                      </ThemeIcon>
                    ) : (
                      <ThemeIcon size={24} radius="xl" color="gray" variant="light">
                        <IconLoader size={14} />
                      </ThemeIcon>
                    )
                  }
                >
                  <Group gap="xs" mt={-4}>
                    <Icon size={16} color={isDone ? "var(--mantine-color-green-6)" : isActive ? "var(--mantine-color-blue-5)" : "var(--mantine-color-dimmed)"} />
                    <Text
                      size="sm"
                      fw={isActive ? 600 : 400}
                      c={isDone ? "green" : isActive ? "white" : "dimmed"}
                    >
                      {t(phase)}
                    </Text>
                  </Group>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Box>
      </Stack>
    </Paper>
  );
};
