"use client";

import { Badge, Group, Paper, Stack, Table, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconDatabase, IconGitBranch } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { BackupAnalysis } from "./types";
import { PREVIEW_TABLE_KEYS } from "./types";

interface BackupPreviewPanelProps {
  analysis: BackupAnalysis;
}

export const BackupPreviewPanel = ({ analysis }: BackupPreviewPanelProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore.preview");
  const exportDate = new Date(analysis.metadata.exportedAt).toLocaleString();
  const pendingCount = analysis.migrations.pending.length;
  const hasPendingMigrations = pendingCount > 0;

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
              <IconDatabase size={18} />
            </ThemeIcon>
            <div>
              <Title order={5}>{t("title")}</Title>
              <Text size="xs" c="dimmed">
                {t("exported", { date: exportDate })}
              </Text>
            </div>
            <Badge variant="light" color="gray" ml="auto">
              Homarr {analysis.metadata.homarrVersion}
            </Badge>
          </Group>

          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("entity")}</Table.Th>
                <Table.Th ta="right">{t("count")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {PREVIEW_TABLE_KEYS.map((key) => (
                <Table.Tr key={key}>
                  <Table.Td>{t(`entities.${key}` as never)}</Table.Td>
                  <Table.Td ta="right">
                    <Group gap={4} justify="flex-end">
                      {(analysis.counts[key] ?? 0) > 0 && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                      <Text size="sm" ff="monospace">
                        {analysis.counts[key] ?? 0}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {analysis.boardNames.length > 0 && (
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={500}>
                {t("boards")}:
              </Text>
              {analysis.boardNames.map((name) => (
                <Badge key={name} variant="light" size="sm">
                  {name}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Paper>

      {hasPendingMigrations && (
        <Paper p="md" radius="md" withBorder bd="1px solid var(--mantine-color-orange-8)">
          <Group gap="sm">
            <ThemeIcon variant="light" color="orange" size="lg" radius="xl">
              <IconGitBranch size={18} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={600}>
                {pendingCount === 1
                  ? t("migrationsApplied", { count: String(pendingCount) })
                  : t("migrationsAppliedPlural", { count: String(pendingCount) })}
              </Text>
              <Text size="xs" c="dimmed">
                {pendingCount === 1
                  ? t("migrationsOlderVersion", { count: String(pendingCount) })
                  : t("migrationsOlderVersionPlural", { count: String(pendingCount) })}
              </Text>
            </div>
            <Badge variant="light" color="orange" ml="auto">
              {t("migrationsPending", { count: String(pendingCount) })}
            </Badge>
          </Group>
        </Paper>
      )}

      {!hasPendingMigrations && (
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon variant="light" color="green" size="lg" radius="xl">
              <IconGitBranch size={18} />
            </ThemeIcon>
            <Text size="sm" fw={500} c="dimmed">
              {t("migrationsUpToDate", { count: String(analysis.migrations.total) })}
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
};
