"use client";

import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconDatabaseExport } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { BackupExportButton } from "~/components/backup";

export const BackupExportCard = () => {
  const t = useScopedI18n("management.page.tool.backup.export");

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group gap="sm">
          <IconDatabaseExport size={24} />
          <Title order={4}>{t("title")}</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {t("description")}
        </Text>
        <BackupExportButton />
      </Stack>
    </Card>
  );
};
