"use client";

import { Box, Group, Loader, Paper, Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import { IconCheck, IconDatabase, IconLoader } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { MigrationProgress } from "./use-backup-analysis";

interface MigrationProgressPanelProps {
  progress: MigrationProgress;
}

export const MigrationProgressPanel = ({ progress }: MigrationProgressPanelProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore.migration");

  return (
    <Paper p="md" radius="md" bg="var(--mantine-color-dark-7)">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="blue" radius="xl">
            <IconDatabase size={12} />
          </ThemeIcon>
          <Text size="sm" fw={600}>
            {t("title", { current: String(progress.current), total: String(progress.total) })}
          </Text>
        </Group>

        <Box pl={4}>
          <Timeline active={progress.current - 1} bulletSize={20} lineWidth={2} color="blue">
            {Array.from({ length: progress.total }, (_, i) => {
              const isDone = i < progress.current - 1 || (i === progress.current - 1 && progress.phase === "done");
              const isActive = i === progress.current - 1 && progress.phase === "applying";

              return (
                <Timeline.Item
                  key={i}
                  bullet={
                    isDone ? (
                      <IconCheck size={12} />
                    ) : isActive ? (
                      <Loader size={10} color="white" />
                    ) : (
                      <IconLoader size={12} />
                    )
                  }
                  title={
                    <Text size="xs" ff="monospace" c={isDone ? "dimmed" : isActive ? "white" : "dimmed"}>
                      {i === progress.current - 1 ? progress.tag : t("migrationLabel", { index: String(i + 1) })}
                    </Text>
                  }
                />
              );
            })}
          </Timeline>
        </Box>
      </Stack>
    </Paper>
  );
};
