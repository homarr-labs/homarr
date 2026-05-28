"use client";

import type { ReactNode } from "react";
import { Button, Group } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface ModalFormFooterProps {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  leftSection?: ReactNode;
}

const ActionButtons = ({
  onCancel,
  submitLabel,
  cancelLabel,
  loading,
}: Pick<ModalFormFooterProps, "onCancel" | "submitLabel" | "cancelLabel" | "loading">) => {
  const t = useI18n();

  return (
    <>
      <Button onClick={onCancel} variant="subtle" color="gray">
        {cancelLabel ?? t("common.action.cancel")}
      </Button>
      <Button type="submit" loading={loading}>
        {submitLabel ?? t("common.action.saveChanges")}
      </Button>
    </>
  );
};

export const ModalFormFooter = ({ onCancel, submitLabel, cancelLabel, loading, leftSection }: ModalFormFooterProps) => {
  const actionButtons = (
    <ActionButtons onCancel={onCancel} submitLabel={submitLabel} cancelLabel={cancelLabel} loading={loading} />
  );

  if (leftSection) {
    return (
      <Group justify="space-between">
        {leftSection}
        <Group justify="end" w={{ base: "100%", xs: "auto" }}>
          {actionButtons}
        </Group>
      </Group>
    );
  }

  return <Group justify="end">{actionButtons}</Group>;
};
