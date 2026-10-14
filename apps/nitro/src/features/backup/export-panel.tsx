import { useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";

import type { BackupDownload, BackupFailureCode, BackupTransport } from "./contracts";
import { BackupConfirmation } from "./confirmation";
import { BackupFailure } from "./feedback";
import { getBackupFailureCode } from "./native-transport";

type ExportState =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "exporting" }
  | { kind: "download"; download: BackupDownload }
  | { kind: "failed"; code: BackupFailureCode };

export function BackupExportPanel({ transport }: { transport: BackupTransport }) {
  const t = useI18n("management.page.tool.backup.export");
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const [downloadLink, setDownloadLink] = useState<{ download: BackupDownload; url: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const download = state.kind === "download" ? state.download : null;

  useEffect(() => {
    setState({ kind: "idle" });
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [transport]);

  useEffect(() => {
    setDownloadLink(null);
    if (!download) return;
    const url = URL.createObjectURL(download.blob);
    setDownloadLink({ download, url });
    return () => URL.revokeObjectURL(url);
  }, [download]);

  function requestExport() {
    if (active.current || !transport.capabilities.export) return;
    const controller = new AbortController();
    active.current = controller;
    setState({ kind: "exporting" });
    void Promise.resolve()
      .then(() => transport.exportAsync(controller.signal))
      .then(
        (result) => {
          if (active.current === controller && !controller.signal.aborted) {
            setState({ kind: "download", download: result });
            active.current = null;
          }
        },
        (error: unknown) => {
          if (active.current === controller && !controller.signal.aborted) {
            setState({ kind: "failed", code: getBackupFailureCode(error) });
            active.current = null;
          }
        },
      );
  }

  function clearExport() {
    active.current?.abort();
    active.current = null;
    setState({ kind: "idle" });
  }

  return (
    <Stack gap="sm" component="section" aria-label="Export backup">
      <Text size="sm">
        Export the current database as a sensitive Homarr ZIP. This does not back up external services or all durable
        files.
      </Text>
      {!transport.capabilities.export && (
        <Alert color="orange" title="Export transport unavailable">
          No accepted native export endpoint is bound. This screen does not fall back to the legacy server.
        </Alert>
      )}
      {state.kind === "confirm" && (
        <BackupConfirmation
          operation="export"
          unavailable={!transport.capabilities.export}
          onConfirm={requestExport}
          onCancel={clearExport}
        />
      )}
      {state.kind === "exporting" && (
        <Stack gap="xs">
          <Text component="output" aria-live="polite" aria-busy>
            Waiting for the server to return the backup ZIP. Download completion is not yet known.
          </Text>
          <Button variant="default" onClick={clearExport}>
            Cancel export request
          </Button>
        </Stack>
      )}
      {state.kind === "failed" && <BackupFailure code={state.code} />}
      {state.kind === "download" && (
        <Stack gap="xs">
          <Text component="output" aria-live="polite">
            The server returned a backup ZIP. Save it below; this screen cannot verify that your browser saved the file.
          </Text>
          <Group>
            {downloadLink?.download === state.download && (
              <Button component="a" href={downloadLink.url} download={state.download.filename}>
                Save backup ZIP
              </Button>
            )}
            <Button variant="default" onClick={clearExport}>
              Discard download
            </Button>
          </Group>
          <Text size="sm" style={{ overflowWrap: "anywhere" }}>
            {state.download.filename}
          </Text>
        </Stack>
      )}
      {(state.kind === "idle" || state.kind === "failed") && (
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            disabled={!transport.capabilities.export}
            onClick={() => setState({ kind: "confirm" })}
          >
            {t("button")}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
