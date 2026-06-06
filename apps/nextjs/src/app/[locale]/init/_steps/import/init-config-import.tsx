"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Stack } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { ConfigImportPreviewPanel } from "~/components/config-import/config-import-preview-panel";

import { FileInfoCard } from "./file-info-card";

export const InitConfigImport = () => {
  const t = useI18n() as unknown as (key: string, values?: Record<string, unknown>) => string;
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [fileContent, setFileContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasOpenedRef = useRef(false);

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
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    setTimeout(() => inputRef.current?.click(), 100);
  }, []);

  useEffect(() => {
    if (!fileContent) {
      resetPreview();
      return;
    }
    runPreview({ content: fileContent });
  }, [fileContent, runPreview, resetPreview]);

  const importAllowed = preview?.compatibility.status === "compatible";

  const handleImport = async () => {
    if (!file || !importAllowed) return;

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    void selectedFile.text().then((content) => {
      setFileContent(content);
      setFile(selectedFile as FileWithPath);
    });
  };

  return (
    <Stack w="100%" mb="sm">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {file && (
        <>
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
        </>
      )}

      {!file && (
        <Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => inputRef.current?.click()}>
          {t("init.step.import.configImport.selectFile")}
        </Button>
      )}
    </Stack>
  );
};
