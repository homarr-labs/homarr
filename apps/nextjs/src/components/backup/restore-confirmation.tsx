"use client";

import { IconDatabaseImport } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { DangerousActionConfirmation } from "./dangerous-action-confirmation";

interface RestoreConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const RestoreConfirmation = ({ onConfirm, onCancel, disabled }: RestoreConfirmationProps) => {
  const t = useScopedI18n("management.page.tool.backup.restore.confirm");

  return (
    <DangerousActionConfirmation
      title={t("title")}
      warningTitle={t("warningTitle")}
      warningBody={t("warningBody")}
      typePrompt={t("typePrompt", { phrase: "I understand" })}
      submitLabel={t("submit")}
      submitIcon={<IconDatabaseImport size={16} />}
      cancelLabel={t("cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
      disabled={disabled}
    />
  );
};
