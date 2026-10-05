"use client";

import { Button, FileInput, Group, Stack } from "@mantine/core";
import { IconCertificate } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import type { MaybePromise } from "@homarr/common/types";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { checkCertificateFile } from "@homarr/validation/certificates";

interface CertificateUploadFormProps {
  embedded?: boolean;
  onSuccess?: () => MaybePromise<void>;
  onCancel?: () => void;
}

export const CertificateUploadForm = ({ embedded = false, onSuccess, onCancel }: CertificateUploadFormProps) => {
  const t = useI18n();
  const form = useZodForm(
    z.object({
      file: z.file().check(checkCertificateFile),
    }),
    {
      initialValues: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: null!,
      },
    },
  );
  const { mutateAsync, isPending } = clientApi.certificates.addCertificate.useMutation();

  const handleSubmit = async () => {
    const validation = form.validate();
    if (validation.hasErrors || !form.values.file) return;

    const formData = new FormData();
    formData.set("file", form.values.file);
    await mutateAsync(formData, {
      onSuccess: async () => {
        showSuccessNotification({
          title: t("certificate.action.create.notification.success.title"),
          message: t("certificate.action.create.notification.success.message"),
        });
        form.reset();
        await onSuccess?.();
      },
      onError: () => {
        showErrorNotification({
          title: t("certificate.action.create.notification.error.title"),
          message: t("certificate.action.create.notification.error.message"),
        });
      },
    });
  };

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  const submit = () => {
    void handleSubmit().catch(() => undefined);
  };

  let submitButtonType: "button" | "submit" = "submit";
  let handleSubmitClick: (() => void) | undefined;
  if (embedded) {
    submitButtonType = "button";
    handleSubmitClick = submit;
  }

  const content = (
    <>
      <FileInput
        label={t("certificate.action.create.label")}
        leftSection={<IconCertificate size={16} />}
        {...form.getInputProps("file")}
      />
      <Group justify="end">
        {onCancel && (
          <Button onClick={handleCancel} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
        )}
        <Button type={submitButtonType} onClick={handleSubmitClick} loading={isPending}>
          {t("common.action.add")}
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
