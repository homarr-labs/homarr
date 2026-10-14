"use client";

import { Badge, Group, Paper, Stack, Table, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconDatabase, IconGitBranch } from "@tabler/icons-react";

import type { BackupPreviewViewProps } from "./contracts";

export const BackupPreviewView = ({
  title,
  exportedLabel,
  homarrVersion,
  entityLabel,
  countLabel,
  rows,
  boardsLabel,
  boardNames,
  migrations,
}: BackupPreviewViewProps) => {
  const hasPendingMigrations = migrations.pendingCount > 0;

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
              <IconDatabase size={18} />
            </ThemeIcon>
            <div>
              <Title order={5}>{title}</Title>
              <Text size="xs" c="dimmed">
                {exportedLabel}
              </Text>
            </div>
            <Badge variant="light" color="gray" ml="auto">
              Homarr {homarrVersion}
            </Badge>
          </Group>

          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{entityLabel}</Table.Th>
                <Table.Th ta="right">{countLabel}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.key}>
                  <Table.Td>{row.label}</Table.Td>
                  <Table.Td ta="right">
                    <Group gap={4} justify="flex-end">
                      {row.count > 0 && <IconCheck size={14} color="var(--mantine-color-green-6)" />}
                      <Text size="sm" ff="monospace">
                        {row.count}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {boardNames.length > 0 && (
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={500}>
                {boardsLabel}:
              </Text>
              {boardNames.map((name) => (
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
                {migrations.pendingTitle}
              </Text>
              <Text size="xs" c="dimmed">
                {migrations.pendingDescription}
              </Text>
            </div>
            <Badge variant="light" color="orange" ml="auto">
              {migrations.pendingLabel}
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
              {migrations.upToDateLabel}
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
};
