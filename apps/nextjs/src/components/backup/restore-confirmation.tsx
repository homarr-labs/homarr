"use client";

import { IconDatabaseImport } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { DangerousActionConfirmation } from "./dangerous-action-confirmation";

interface RestoreConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const RestoreConfirmation = ({ onConfirm, onCancel, disabled }: RestoreConfirmationProps) => {
  const t = useI18n("management.page.tool.backup.restore.confirm");
  const tBackup = useI18n("management.page.tool.backup");
  const tCommon = useI18n("common");

  return (
    <DangerousActionConfirmation
      title={t("title")}
      warningTitle={t("warningTitle")}
      warningBody={t("warningBody")}
      typePrompt={tBackup("confirm.typePrompt", { phrase: "I understand" })}
      submitLabel={t("submit")}
      submitIcon={<IconDatabaseImport size={16} />}
      cancelLabel={tCommon("action.cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
      disabled={disabled}
    />
  );
};
