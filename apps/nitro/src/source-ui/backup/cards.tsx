import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconDatabaseExport, IconDatabaseImport } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";

import type { BackupTransport } from "../../features/backup/contracts";
import { BackupExportPanel } from "../../features/backup/export-panel";
import { DatabaseRestoreFlow } from "./database-restore-flow";

export function BackupExportCard({ transport }: { transport: BackupTransport }) {
  const t = useI18n("management.page.tool.backup.export");
  return (
    <Card withBorder component="section" aria-label={t("title")}>
      <Stack gap="sm">
        <Group gap="sm">
          <IconDatabaseExport size={24} />
          <Title order={4}>{t("title")}</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {t("description")}
        </Text>
        <BackupExportPanel transport={transport} />
      </Stack>
    </Card>
  );
}

export function BackupImportCard({ transport }: { transport: BackupTransport }) {
  const t = useI18n("management.page.tool.backup.import");
  return (
    <Card withBorder component="section" aria-label={t("title")}>
      <Stack gap="md">
        <Group gap="sm">
          <IconDatabaseImport size={24} />
          <Title order={4}>{t("title")}</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {t("description")}
        </Text>
        <DatabaseRestoreFlow transport={transport} />
      </Stack>
    </Card>
  );
}
