"use client";

import { useState } from "react";
import { Alert, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconDatabaseExport, IconDownload } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { DangerousActionConfirmation } from "~/components/backup/dangerous-action-confirmation";

export const BackupExportCard = () => {
  const t = useScopedI18n("management.page.tool.backup.export");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/backup/export");
      if (!response.ok) {
        const errorMessage = await response.json().then(
          (data) => data.error,
          () => `Server returned ${response.status}`,
        );
        throw new Error(errorMessage ?? t("error"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "homarr-backup.zip";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

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
        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}

        {showConfirm ? (
          <DangerousActionConfirmation
            title={t("confirm.title")}
            warningTitle={t("confirm.warningTitle")}
            warningBody={t("confirm.warningBody")}
            typePrompt={t("confirm.typePrompt", { phrase: "I understand" })}
            submitLabel={t("confirm.submit")}
            submitIcon={<IconDownload size={16} />}
            cancelLabel={t("confirm.cancel")}
            onConfirm={handleExport}
            onCancel={() => setShowConfirm(false)}
            disabled={loading}
            color="orange"
          />
        ) : (
          <Group>
            <Button leftSection={<IconDownload size={16} />} loading={loading} onClick={() => setShowConfirm(true)}>
              {t("button")}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
};
