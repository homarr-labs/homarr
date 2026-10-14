import { Box, Group, Loader, Paper, Stack, Text, ThemeIcon, Timeline } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconCheck, IconDatabase, IconLoader } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";

export {
  RestoreProgressView,
  RestoreProgressView as RestoreProgressPanel,
} from "@homarr/ui/source-views/recovery-operations";
export type { RestoreProgressViewProps } from "@homarr/ui/source-views/recovery-operations";

export interface BackupMigrationProgress {
  current: number;
  total: number;
  tag: string;
  phase: "pending" | "applying" | "done" | "error";
}

export function MigrationProgressPanel({ progress }: { progress: BackupMigrationProgress }) {
  const t = useI18n("management.page.tool.backup.restore.migration");
  const reduceMotion = useReducedMotion();
  if (
    !Number.isSafeInteger(progress.total) ||
    !Number.isSafeInteger(progress.current) ||
    progress.total < 1 ||
    progress.current < 1 ||
    progress.current > progress.total
  )
    return null;

  return (
    <Paper
      component="output"
      p="md"
      radius="md"
      bg="var(--mantine-color-dark-7)"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={progress.phase === "applying"}
    >
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
            {Array.from({ length: progress.total }, (_, index) => {
              const isDone =
                index < progress.current - 1 || (index === progress.current - 1 && progress.phase === "done");
              const isActive = index === progress.current - 1 && progress.phase === "applying";
              let bullet = <IconLoader size={12} />;
              if (isDone) bullet = <IconCheck size={12} />;
              else if (isActive && !reduceMotion) bullet = <Loader size={10} color="white" />;
              let color = "dimmed";
              if (isActive) color = "white";
              let label = t("migrationLabel", { index: String(index + 1) });
              if (index === progress.current - 1) label = progress.tag;
              return (
                <Timeline.Item
                  key={index}
                  bullet={bullet}
                  title={
                    <Text size="xs" ff="monospace" c={color}>
                      {label}
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
}
