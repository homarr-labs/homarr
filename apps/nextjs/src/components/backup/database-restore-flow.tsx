"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Loader, rem, Stack, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconAlertTriangle, IconArrowRight, IconFileZip, IconUpload, IconX } from "@tabler/icons-react";

import "@mantine/dropzone/styles.css"; // oxlint-disable-line import/no-unassigned-import

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

const DEFAULT_RESTART_DELAY_MS = 500;
const RESTART_READINESS_TIMEOUT_MS = 45_000;
const RESTART_POLL_INTERVAL_MS = 750;
const RESTART_REQUEST_TIMEOUT_MS = 5_000;

export type ServerReadinessResult = "ready" | "timedOut" | "aborted";

interface WaitForServerReadinessOptions {
  restartAfterMs: number;
  signal: AbortSignal;
  timeoutMs?: number;
  pollIntervalMs?: number;
  requestTimeoutMs?: number;
  requestReady?: (signal: AbortSignal) => Promise<boolean>;
}

const waitAsync = (durationMs: number, signal: AbortSignal) =>
  new Promise<boolean>((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve(true);
    }, durationMs);
    const handleAbort = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener("abort", handleAbort, { once: true });
  });

const requestServerReadinessAsync = async (signal: AbortSignal) => {
  const response = await fetch("/api/health/ready", { cache: "no-store", signal });
  return response.ok;
};

export const waitForServerReadinessAsync = async ({
  restartAfterMs,
  signal,
  timeoutMs = RESTART_READINESS_TIMEOUT_MS,
  pollIntervalMs = RESTART_POLL_INTERVAL_MS,
  requestTimeoutMs = RESTART_REQUEST_TIMEOUT_MS,
  requestReady = requestServerReadinessAsync,
}: WaitForServerReadinessOptions): Promise<ServerReadinessResult> => {
  if (!(await waitAsync(Math.max(0, restartAfterMs), signal))) return "aborted";

  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (!signal.aborted) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 0) return "timedOut";

    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    signal.addEventListener("abort", abortRequest, { once: true });
    const requestTimer = window.setTimeout(abortRequest, Math.min(requestTimeoutMs, remainingMs));

    let ready = false;
    try {
      ready = await requestReady(requestController.signal);
    } catch {
      // The server is expected to be temporarily unreachable while it restarts.
    } finally {
      window.clearTimeout(requestTimer);
      signal.removeEventListener("abort", abortRequest);
    }

    if (signal.aborted) return "aborted";
    if (ready) return "ready";

    const delayMs = Math.min(pollIntervalMs, deadline - Date.now());
    if (delayMs <= 0) return "timedOut";
    if (!(await waitAsync(delayMs, signal))) return "aborted";
  }

  return "aborted";
};

export const DatabaseRestoreFlow = ({ variant = "card", onRestoreComplete }: DatabaseRestoreFlowProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore");
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [step, setStep] = useState<RestoreStep>("upload");
  const [importError, setImportError] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<"restoring" | "restarting" | "timedOut">("restoring");
  const restartControllerRef = useRef<AbortController | null>(null);
  const restoreDestinationRef = useRef<string | null>(null);
  const { analysis, loading, error: analysisError, migrationProgress, analyzeFile, reset } = useBackupAnalysis();

  useEffect(
    () => () => {
      restartControllerRef.current?.abort();
    },
    [],
  );

  const handleFileDrop = useCallback(
    (files: FileWithPath[]) => {
      const droppedFile = files[0];
      if (!droppedFile) return;
      setFile(droppedFile);
      setStep("preview");
      setImportError(null);
      setRestoreStatus("restoring");
      void analyzeFile(droppedFile);
    },
    [analyzeFile],
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setStep("upload");
    setImportError(null);
    setRestoreStatus("restoring");
    restartControllerRef.current?.abort();
    restartControllerRef.current = null;
    reset();
  }, [reset]);

  const startReadinessCheck = useCallback((restartAfterMs: number, destination = restoreDestinationRef.current) => {
    restartControllerRef.current?.abort();
    restoreDestinationRef.current = destination;
    const restartController = new AbortController();
    restartControllerRef.current = restartController;
    setRestoreStatus("restarting");

    void waitForServerReadinessAsync({ restartAfterMs, signal: restartController.signal }).then((result) => {
      if (restartControllerRef.current !== restartController || result === "aborted") return;
      if (result === "ready") {
        if (destination) window.location.assign(destination);
        else window.location.reload();
        return;
      }
      restartControllerRef.current = null;
      setRestoreStatus("timedOut");
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setStep("restoring");
    setImportError(null);
    setRestoreStatus("restoring");
    restartControllerRef.current?.abort();
    restartControllerRef.current = null;

    let restartAfterMs = DEFAULT_RESTART_DELAY_MS;
    let homeBoardName: string | null = null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/backup/import", { method: "POST", body: formData });
      const data = (await response.json().catch(() => null)) as {
        error?: unknown;
        homeBoardName?: unknown;
        restartAfterMs?: unknown;
      } | null;

      if (!response.ok) {
        const message = typeof data?.error === "string" ? data.error : `Server returned ${response.status}`;
        setImportError(message);
        setStep("error");
        return;
      }

      if (
        typeof data?.restartAfterMs === "number" &&
        Number.isFinite(data.restartAfterMs) &&
        data.restartAfterMs >= 0
      ) {
        restartAfterMs = data.restartAfterMs;
      }
      if (typeof data?.homeBoardName === "string") homeBoardName = data.homeBoardName;
    } catch {
      setImportError(t("failed.title"));
      setStep("error");
      return;
    }

    onRestoreComplete?.();
    const destination =
      variant === "standalone" && homeBoardName ? `/boards/${encodeURIComponent(homeBoardName)}` : null;
    startReadinessCheck(restartAfterMs, destination);
  }, [file, onRestoreComplete, startReadinessCheck, t, variant]);

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
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" miw={0}>
            <IconFileZip size={20} />
            <Group>
              <Text size="sm" fw={500} truncate>
                {file?.name}
              </Text>
              <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
              </Text>
            </Group>
          </Group>
          <Button variant="subtle" size="xs" onClick={handleClear} style={{ flexShrink: 0 }}>
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
              <Button
                rightSection={<IconArrowRight size={16} />}
                onClick={() => (variant === "standalone" ? void handleConfirm() : setStep("confirm"))}
              >
                {variant === "standalone" ? t("confirm.submit") : t("continueToRestore")}
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
        status={restoreStatus}
        onRetry={() => startReadinessCheck(0)}
        onReload={() => window.location.reload()}
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
