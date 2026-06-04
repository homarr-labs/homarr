"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, FileInput, Group, List, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconFileUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { ConfigImportPreviewPanel } from "~/components/config-import/config-import-preview-panel";

export const ImportConfigCard = () => {
  const t = useI18n() as unknown as (key: string, values?: Record<string, unknown>) => string;
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [importResult, setImportResult] = useState<{
    boards: number;
    apps: number;
    integrations: number;
    groups: number;
    searchEngines: number;
    warnings: string[];
  } | null>(null);

  const {
    mutate: runPreview,
    data: preview,
    isPending: previewLoading,
    reset: resetPreview,
  } = clientApi.config.previewImport.useMutation();

  const { mutateAsync, isPending } = clientApi.config.importFull.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage");
    },
  });

  useEffect(() => {
    if (!fileContent) {
      resetPreview();
      return;
    }
    runPreview({ content: fileContent });
  }, [fileContent, runPreview, resetPreview]);

  const importAllowed = preview?.compatibility.status === "compatible";

  const handleImport = async () => {
    if (!file || !importAllowed) {
      return;
    }
    const content = await file.text();
    await mutateAsync(
      { content },
      {
        onSuccess(result) {
          setImportResult(result);
          showSuccessNotification({
            title: t("management.page.importExport.importConfig.notification.success.title"),
            message: t("management.page.importExport.importConfig.notification.success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: t("management.page.importExport.importConfig.notification.error.title"),
            message: t("management.page.importExport.importConfig.notification.error.message"),
          });
        },
      },
    );
  };

  return (
    <Card withBorder>
      <Stack>
        <Stack gap="xs">
          <Title order={3}>{t("management.page.importExport.importConfig.title")}</Title>
          <Text size="sm" c="dimmed">
            {t("management.page.importExport.importConfig.description")}
          </Text>
        </Stack>

        <FileInput
          rightSection={<IconFileUpload />}
          accept="application/json"
          value={file}
          onChange={(newFile) => {
            setFile(newFile);
            setImportResult(null);
            setFileContent("");

            if (!newFile) {
              return;
            }

            void newFile.text().then((content) => {
              setFileContent(content);
            });
          }}
          label={t("management.page.importExport.importConfig.fileLabel")}
        />

        <ConfigImportPreviewPanel preview={preview} previewLoading={previewLoading} t={t} />

        {importResult && (
          <Alert color="green" icon={<IconCheck />}>
            <List size="sm">
              <List.Item>{importResult.boards} boards imported</List.Item>
              <List.Item>{importResult.apps} apps created</List.Item>
              <List.Item>{importResult.integrations} integrations created</List.Item>
              <List.Item>{importResult.groups} groups created</List.Item>
            </List>
          </Alert>
        )}

        <Group justify="end">
          <Button loading={isPending} disabled={!file || !importAllowed || previewLoading} onClick={() => void handleImport()}>
            {t("common.action.import")}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};
