"use client";

import { Button, FileInput, Group, Stack } from "@mantine/core";
import { IconCertificate } from "@tabler/icons-react";

import type { CertificateUploadViewProps } from "./contracts";

export const CertificateUploadView = ({
  embedded = false,
  fileInputProps,
  pending,
  copy,
  onCancel,
  onSubmit,
}: CertificateUploadViewProps) => {
  const submit = () => {
    void onSubmit().catch(() => undefined);
  };

  let submitButtonType: "button" | "submit" = "submit";
  let handleSubmitClick: (() => void) | undefined;
  if (embedded) {
    submitButtonType = "button";
    handleSubmitClick = submit;
  }

  const content = (
    <>
      <FileInput label={copy.label} leftSection={<IconCertificate size={16} />} {...fileInputProps} />
      <Group justify="end">
        {onCancel && (
          <Button onClick={onCancel} variant="subtle" color="gray">
            {copy.cancel}
          </Button>
        )}
        <Button type={submitButtonType} onClick={handleSubmitClick} loading={pending}>
          {copy.add}
        </Button>
      </Group>
    </>
  );

  if (embedded) {
    return <Stack>{content}</Stack>;
  }

  return (
    <Stack
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {content}
    </Stack>
  );
};
