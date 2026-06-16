"use client";

import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconDatabaseImport } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { DatabaseRestoreFlow } from "~/components/backup";

export const BackupImportCard = () => {
  const t = useScopedI18n("management.page.tool.backup.import");

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group gap="sm">
          <IconDatabaseImport size={24} />
          <Title order={4}>{t("title")}</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {t("description")}
        </Text>
        <DatabaseRestoreFlow />
      </Stack>
    </Card>
  );
};
