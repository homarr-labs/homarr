import { Alert, Badge, Group, Stack, Table, Text, Title } from "@mantine/core";

import type { BackupInspection } from "./contracts";

export function BackupPreviewPanel({ inspection }: { inspection: BackupInspection }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Title order={3}>Source database preview</Title>
        <Badge variant="light">Homarr {inspection.metadata.homarrVersion}</Badge>
      </Group>
      <Text size="sm">Exported {new Date(inspection.metadata.exportedAt).toLocaleString()} · SQLite · SQL-only</Text>
      <Table.ScrollContainer minWidth={320}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Durable data family</Table.Th>
              <Table.Th ta="right">Count</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Object.entries(inspection.counts).map(([family, count]) => (
              <Table.Tr key={family}>
                <Table.Td>{family}</Table.Td>
                <Table.Td ta="right">{count.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
          <Table.Caption>
            Counts describe the inspected copy, not the current instance or a board-only import.
          </Table.Caption>
        </Table>
      </Table.ScrollContainer>
      <Title order={4}>Encrypted fields</Title>
      <Table.ScrollContainer minWidth={320}>
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Field</Table.Th>
              <Table.Th ta="right">Count</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Object.entries(inspection.encryptedFields).map(([field, count]) => (
              <Table.Tr key={field}>
                <Table.Td>{field}</Table.Td>
                <Table.Td ta="right">{count.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="sm">
        Source key in archive: {inspection.carriesEncryptionKey ? "present, never displayed" : "not included"}.
      </Text>
      <Text size="sm">
        Schema and content validation run on a disposable copy. Inspection does not verify ciphertext decryption.
      </Text>
      <Alert color="orange" title="Migration evidence unavailable">
        This inspection contract does not return migration counts or progress. It cannot establish that the source is up
        to date, that migrations ran, or that a restore is ready to apply.
      </Alert>
      <Text size="sm">Source home board: {inspection.homeBoard?.name ?? "none recorded"}.</Text>
    </Stack>
  );
}
