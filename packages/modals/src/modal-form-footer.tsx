"use client";

import type { ReactNode } from "react";
import { Button, Group } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface ModalFormFooterProps {
  onCancel: () => void;
  form?: string;
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
  form,
}: Pick<ModalFormFooterProps, "onCancel" | "submitLabel" | "cancelLabel" | "loading" | "form">) => {
  const t = useI18n("common.action");

  return (
    <>
      <Button onClick={onCancel} variant="subtle" color="gray">
        {cancelLabel ?? t("cancel")}
      </Button>
      <Button type="submit" form={form} loading={loading}>
        {submitLabel ?? t("saveChanges")}
      </Button>
    </>
  );
};

export const ModalFormFooter = ({
  onCancel,
  form,
  submitLabel,
  cancelLabel,
  loading,
  leftSection,
}: ModalFormFooterProps) => {
  const actionButtons = (
    <ActionButtons
      onCancel={onCancel}
      form={form}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      loading={loading}
    />
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
