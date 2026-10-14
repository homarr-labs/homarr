import { Container, Stack, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

import { BackupExportCard, BackupImportCard } from "../../source-ui/backup/cards";
import type { BackupTransport } from "./contracts";
import { BackupDataWarning } from "./feedback";
import { createBackupNativeTransport } from "./native-transport";

const unavailableTransport = createBackupNativeTransport();

export interface BackupPageProps {
  transport?: BackupTransport;
}

export function BackupPage({ transport = unavailableTransport }: BackupPageProps) {
  const t = useI18n("management.page.tool.backup");
  return (
    <Container size="md">
      <Stack>
        <Title>{t("title")}</Title>
        <BackupDataWarning />
        <BackupExportCard transport={transport} />
        <BackupImportCard transport={transport} />
      </Stack>
    </Container>
  );
}
