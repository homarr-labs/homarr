"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Icon } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { MigrationFile } from "./types";

const BASE_PHASE_DURATIONS = {
  extracting: 1200,
  encrypting: 1500,
  swapping: 800,
  restarting: 10000,
} as const;

const MIGRATION_STEP_DURATION = 100;

interface TimelineStep {
  key: string;
  label: string;
  icon: Icon;
  duration: number;
}

interface RestoreProgressPanelProps {
  active: boolean;
  migrations: MigrationFile[];
  onComplete?: () => void;
}

export const RestoreProgressPanel = ({ active, migrations, onComplete }: RestoreProgressPanelProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore.progress");
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);

  const steps = useMemo((): TimelineStep[] => {
    const result: TimelineStep[] = [
      { key: "extracting", label: t("extracting"), icon: IconFileZip, duration: BASE_PHASE_DURATIONS.extracting },
    ];

    if (migrations.length > 0) {
      for (const migration of migrations) {
        result.push({
          key: `migration-${migration.idx}`,
          label: migration.tag,
          icon: IconDatabaseImport,
          duration: MIGRATION_STEP_DURATION,
        });
      }
    } else {
      result.push({
        key: "migrating",
        label: t("migrating"),
        icon: IconDatabaseImport,
        duration: 300,
      });
    }

    result.push(
      { key: "encrypting", label: t("encrypting"), icon: IconKey, duration: BASE_PHASE_DURATIONS.encrypting },
      { key: "swapping", label: t("swapping"), icon: IconTransform, duration: BASE_PHASE_DURATIONS.swapping },
      { key: "restarting", label: t("restarting"), icon: IconRefresh, duration: BASE_PHASE_DURATIONS.restarting },
    );

    return result;
  }, [migrations, t]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const run = async () => {
      for (const [i, step] of steps.entries()) {
        if (cancelled) return;
        setCurrentStepIdx(i);
        await new Promise((r) => setTimeout(r, step.duration));
      }
      if (!cancelled) {
        onComplete?.();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active, onComplete, steps]);

  if (!active && currentStepIdx === -1) return null;

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
          <Timeline active={currentStepIdx} bulletSize={24} lineWidth={2} color="blue">
            {steps.map((step, i) => {
              const isDone = i < currentStepIdx;
              const isActive = i === currentStepIdx;
              const isMigration = step.key.startsWith("migration-");

              return (
                <Timeline.Item
                  key={step.key}
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
                    <step.icon
                      size={16}
                      color={
                        isDone
                          ? "var(--mantine-color-green-6)"
                          : isActive
                            ? "var(--mantine-color-blue-5)"
                            : "var(--mantine-color-dimmed)"
                      }
                    />
                    <Text
                      size={isMigration ? "xs" : "sm"}
                      fw={isActive ? 600 : 400}
                      ff={isMigration ? "monospace" : undefined}
                      c={isDone ? "green" : isActive ? "white" : "dimmed"}
                    >
                      {step.label}
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
