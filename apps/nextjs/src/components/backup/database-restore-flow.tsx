"use client";

import { useCallback, useRef, useState } from "react";
import { Alert, Button, Group, Loader, rem, Stack, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconAlertTriangle, IconArrowRight, IconFileZip, IconUpload, IconX } from "@tabler/icons-react";

import "@mantine/dropzone/styles.css";

import { useScopedI18n } from "@homarr/translation/client";

import type { RestoreStep } from "./types";
import { BackupPreviewPanel } from "./backup-preview-panel";
import { MigrationProgressPanel } from "./migration-progress-panel";
import { RestoreConfirmation } from "./restore-confirmation";
import { RestoreProgressPanel } from "./restore-progress-panel";
import { useBackupAnalysis } from "./use-backup-analysis";

interface DatabaseRestoreFlowProps {
  variant?: "card" | "standalone";
  onRestoreComplete?: () => void;
}

export const DatabaseRestoreFlow = ({ variant = "card", onRestoreComplete }: DatabaseRestoreFlowProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore");
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [step, setStep] = useState<RestoreStep>("upload");
  const [importError, setImportError] = useState<string | null>(null);
  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);
  const apiErrorRef = useRef<string | null>(null);
  const { analysis, loading, error: analysisError, migrationProgress, analyzeFile, reset } = useBackupAnalysis();

  const handleFileDrop = useCallback(
    (files: FileWithPath[]) => {
      const droppedFile = files[0];
      if (!droppedFile) return;
      setFile(droppedFile);
      setStep("preview");
      setImportError(null);
      void analyzeFile(droppedFile);
    },
    [analyzeFile],
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setStep("upload");
    setImportError(null);
    apiDoneRef.current = false;
    animDoneRef.current = false;
    apiErrorRef.current = null;
    reset();
  }, [reset]);

  const tryFinalize = useCallback(() => {
    if (!apiDoneRef.current) return;

    if (apiErrorRef.current) {
      setImportError(apiErrorRef.current);
      setStep("error");
      return;
    }

    if (!animDoneRef.current) return;
    onRestoreComplete?.();
    window.location.reload();
  }, [onRestoreComplete]);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setStep("restoring");
    setImportError(null);
    apiDoneRef.current = false;
    animDoneRef.current = false;
    apiErrorRef.current = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/backup/import", { method: "POST", body: formData });

      if (!response.ok) {
        try {
          const data = await response.json();
          apiErrorRef.current = data.error ?? t("failed.title");
        } catch {
          apiErrorRef.current = `Server returned ${response.status}`;
        }
      }
    } catch {
      apiErrorRef.current = t("failed.title");
    } finally {
      apiDoneRef.current = true;
      tryFinalize();
    }
  }, [file, t, tryFinalize]);

  const handleAnimationComplete = useCallback(() => {
    animDoneRef.current = true;
    tryFinalize();
  }, [tryFinalize]);

  if (step === "upload") {
    return (
      <Dropzone
        onDrop={handleFileDrop}
        acceptColor="blue.6"
        rejectColor="red.6"
        accept={[MIME_TYPES.zip, "application/x-zip-compressed"]}
        multiple={false}
        maxSize={1024 * 1024 * 256}
        radius="md"
      >
        <Group justify="center" gap="xl" mih={variant === "standalone" ? 200 : 160} style={{ pointerEvents: "none" }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-blue-6)" }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-red-6)" }} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip
              style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-dimmed)" }}
              stroke={1.5}
            />
          </Dropzone.Idle>
          <div>
            <Text size="xl" inline>
              {t("dropzone.title")}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              {t("dropzone.description")}
            </Text>
          </div>
        </Group>
      </Dropzone>
    );
  }

  if (step === "preview") {
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconFileZip size={20} />
            <div>
              <Text size="sm" fw={500}>
                {file?.name}
              </Text>
              <Text size="xs" c="dimmed">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
              </Text>
            </div>
          </Group>
          <Button variant="subtle" size="xs" onClick={handleClear}>
            {t("changeFile")}
          </Button>
        </Group>

        {loading && migrationProgress && <MigrationProgressPanel progress={migrationProgress} />}

        {loading && !migrationProgress && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t("analyzing")}
            </Text>
          </Group>
        )}

        {analysisError && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("analysisError")}>
            {analysisError}
          </Alert>
        )}

        {analysis && (
          <>
            <BackupPreviewPanel analysis={analysis} />
            <Group justify="flex-end">
              <Button rightSection={<IconArrowRight size={16} />} onClick={() => setStep("confirm")}>
                {t("continueToRestore")}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    );
  }

  if (step === "confirm") {
    return (
      <Stack gap="md">
        {analysis && <BackupPreviewPanel analysis={analysis} />}
        <RestoreConfirmation onConfirm={handleConfirm} onCancel={() => setStep("preview")} />
      </Stack>
    );
  }

  if (step === "restoring") {
    return (
      <RestoreProgressPanel
        active
        migrations={analysis?.migrations.pending ?? []}
        onComplete={handleAnimationComplete}
      />
    );
  }

  if (step === "error") {
    return (
      <Stack gap="md">
        <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("failed.title")} radius="md">
          <Text size="sm">{importError}</Text>
        </Alert>
        <Group>
          <Button variant="subtle" onClick={handleClear}>
            {t("tryAgain")}
          </Button>
        </Group>
      </Stack>
    );
  }

  return null;
};
