"use client";

import { IconDatabaseImport } from "@tabler/icons-react";

import type { RestoreConfirmationViewProps } from "./contracts";
import { DangerousActionConfirmation } from "./dangerous-action-confirmation";

export const RestoreConfirmationView = ({
  title,
  warningTitle,
  warningBody,
  typePrompt,
  submitLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  disabled,
}: RestoreConfirmationViewProps) => (
  <DangerousActionConfirmation
    title={title}
    warningTitle={warningTitle}
    warningBody={warningBody}
    typePrompt={typePrompt}
    submitLabel={submitLabel}
    submitIcon={<IconDatabaseImport size={16} />}
    cancelLabel={cancelLabel}
    onConfirm={onConfirm}
    onCancel={onCancel}
    disabled={disabled}
  />
);
