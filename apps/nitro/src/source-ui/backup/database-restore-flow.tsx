import { useState } from "react";
import { Alert, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconArrowRight, IconDatabase, IconFileZip } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";

import type { BackupTransport } from "../../features/backup/contracts";
import { BackupApplyUnavailable, BackupFailure } from "../../features/backup/feedback";
import { BackupPreviewPanel } from "../../features/backup/preview-panel";
import { BackupRestoreReview } from "../../features/backup/restore-review";
import { useBackupPreview } from "../../features/backup/use-backup-preview";
import { BackupUploadZone } from "./upload-zone";

export interface DatabaseRestoreFlowProps {
  transport: BackupTransport;
  variant?: "card" | "standalone";
}

export function DatabaseRestoreFlow({ transport, variant = "card" }: DatabaseRestoreFlowProps) {
  const t = useI18n("management.page.tool.backup.restore");
  const { state, selectFile } = useBackupPreview(transport);
  const [reviewing, setReviewing] = useState(false);
  const reduceMotion = useReducedMotion();

  function changeFile(file: File | null) {
    setReviewing(false);
    selectFile(file);
  }

  return (
    <Stack gap="md">
      <BackupApplyUnavailable />
      {!transport.capabilities.inspect && (
        <Alert color="orange" title="Inspection transport unavailable">
          No accepted native inspector is bound. File selection does not authorize a restore, and no browser SQL or
          legacy endpoint is substituted.
        </Alert>
      )}
      {state.kind === "empty" ? (
        <BackupUploadZone variant={variant} onSelectFile={changeFile} />
      ) : (
        <>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" miw={0}>
              <IconFileZip size={20} />
              <Group miw={0}>
                <Text size="sm" fw={500} truncate>
                  {state.file.name}
                </Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  {(state.file.size / (1024 * 1024)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MiB
                </Text>
              </Group>
            </Group>
            <Button variant="subtle" size="xs" onClick={() => changeFile(null)} style={{ flexShrink: 0 }}>
              {t("changeFile")}
            </Button>
          </Group>
          {state.kind === "inspecting" && (
            <Stack gap="xs">
              <Group justify="center" py="xl" component="output" aria-live="polite" aria-atomic="true" aria-busy>
                {reduceMotion ? <IconDatabase size={20} aria-hidden /> : <Loader size="sm" aria-hidden />}
                <Text size="sm" c="dimmed">
                  {state.phase === "reading" ? "Reading the selected backup." : t("analyzing")}
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                Native inspection validates a disposable source copy. Migration progress is not reported by this
                contract; no data has been restored.
              </Text>
              <Group>
                <Button variant="default" onClick={() => changeFile(null)}>
                  Cancel inspection
                </Button>
              </Group>
            </Stack>
          )}
          {state.kind === "failed" && (
            <Stack gap="xs">
              <BackupFailure code={state.code} />
              <Group>
                <Button
                  variant="default"
                  disabled={!transport.capabilities.inspect}
                  onClick={() => changeFile(state.file)}
                >
                  Inspect selected file again
                </Button>
              </Group>
            </Stack>
          )}
          {state.kind === "ready" && (
            <>
              <BackupPreviewPanel inspection={state.inspection} />
              {reviewing ? (
                <Stack gap="md">
                  <BackupRestoreReview key={state.file.name + state.file.lastModified} inspection={state.inspection} />
                  <Group>
                    <Button variant="subtle" onClick={() => setReviewing(false)}>
                      Back to preview
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Group justify="flex-end">
                  <Button rightSection={<IconArrowRight size={16} />} onClick={() => setReviewing(true)}>
                    Review restore requirements
                  </Button>
                </Group>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}
