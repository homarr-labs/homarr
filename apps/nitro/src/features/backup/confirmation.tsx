import { Button, Stack } from "@mantine/core";
import { IconDatabaseImport, IconDownload } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";
import { DangerousActionConfirmation } from "@homarr/ui/source-views/recovery-operations";

import { BackupTransportError } from "./native-transport";

export function BackupConfirmation({
  operation,
  busy = false,
  unavailable = false,
  onConfirm,
  onCancel,
}: {
  operation: "export" | "restore";
  busy?: boolean;
  unavailable?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
}) {
  const t = useI18n("management.page.tool.backup");
  const tCommon = useI18n("common");
  const held = operation === "restore" || unavailable || !onConfirm;
  let color = "orange";
  let title = t("export.confirm.title");
  let warningTitle = t("export.confirm.warningTitle");
  let warningBody = t("export.confirm.warningBody");
  let submitLabel = t("export.confirm.submit");
  let submitIcon = <IconDownload size={16} />;
  if (operation === "restore") {
    color = "red";
    title = t("restore.confirm.title");
    warningTitle = t("restore.confirm.warningTitle");
    warningBody = t("restore.confirm.warningBody");
    submitLabel = "Restore unavailable";
    submitIcon = <IconDatabaseImport size={16} />;
  }

  function confirm() {
    if (held || busy || !onConfirm) throw new BackupTransportError("unsupported");
    onConfirm();
  }

  return (
    <Stack gap="sm">
      <DangerousActionConfirmation
        title={title}
        warningTitle={warningTitle}
        warningBody={warningBody}
        typePrompt={t("confirm.typePrompt", { phrase: "I understand" })}
        submitLabel={submitLabel}
        submitIcon={submitIcon}
        cancelLabel={tCommon("action.cancel")}
        onConfirm={confirm}
        onCancel={onCancel}
        disabled={busy || held}
        color={color}
      />
      {held && (
        <Button variant="subtle" disabled={busy} onClick={onCancel}>
          Back to review
        </Button>
      )}
    </Stack>
  );
}
