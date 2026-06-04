"use client";

import { useEffect, useState } from "react";
import { Button, Card, Stack } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { ConfigImportPreviewPanel } from "~/components/config-import/config-import-preview-panel";

import { ConfigImportDropZone } from "./config-import-dropzone";
import { FileInfoCard } from "./file-info-card";

export const InitConfigImport = () => {
  const t = useI18n() as unknown as (key: string, values?: Record<string, unknown>) => string;
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [fileContent, setFileContent] = useState("");

  const {
    mutate: runPreview,
    data: preview,
    isPending: previewLoading,
    reset: resetPreview,
  } = clientApi.import.previewInitialConfigImport.useMutation();

  const { mutateAsync, isPending } = clientApi.import.importInitialConfigImport.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/init");
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

    await mutateAsync(
      { content: fileContent },
      {
        onError() {
          showErrorNotification({
            title: t("management.page.importExport.importConfig.notification.error.title"),
            message: t("management.page.importExport.importConfig.notification.error.message"),
          });
        },
      },
    );
  };

  if (!file) {
    return (
      <Card w={64 * 12 + 8} maw="90vw">
        <ConfigImportDropZone
          loading={previewLoading}
          updateFile={(selectedFile) => {
            void selectedFile.text().then((content) => {
              setFileContent(content);
              setFile(selectedFile);
            });
          }}
        />
      </Card>
    );
  }

  return (
    <Stack mb="sm" w={64 * 12 + 8} maw="90vw">
      <FileInfoCard
        file={file}
        onRemove={() => {
          setFile(null);
          setFileContent("");
        }}
      />
      <ConfigImportPreviewPanel preview={preview} previewLoading={previewLoading} t={t} />
      <Button
        loading={isPending}
        disabled={!importAllowed || previewLoading}
        onClick={() => void handleImport()}
      >
        {t("init.step.import.configImport.action")}
      </Button>
    </Stack>
  );
};
