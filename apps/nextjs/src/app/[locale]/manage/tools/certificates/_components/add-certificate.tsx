"use client";

import { Button, FileInput, Group, Stack } from "@mantine/core";
import { IconCertificate } from "@tabler/icons-react";
import { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { superRefineCertificateFile } from "@homarr/validation/certificates";

export const AddCertificateButton = () => {
  const { openModal } = useModalAction(AddCertificateModal);
  const t = useI18n();

  const handleClick = () => {
    openModal({});
  };

  return <Button onClick={handleClick}>{t("certificate.action.create.label")}</Button>;
};

const AddCertificateModal = createModal(({ actions }) => {
  const t = useI18n();
  const form = useZodForm(
    z.object({
      file: z.instanceof(File).nullable().superRefine(superRefineCertificateFile),
    }),
    {
      initialValues: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: null!,
      },
    },
  );
  const { mutateAsync } = clientApi.certificates.addCertificate.useMutation();

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const formData = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        formData.set("file", values.file!);
        await mutateAsync(formData, {
          async onSuccess() {
            showSuccessNotification({
              title: t("certificate.action.create.notification.success.title"),
              message: t("certificate.action.create.notification.success.message"),
            });
            await revalidatePathActionAsync("/manage/tools/certificates");
            actions.closeModal();
          },
          onError() {
            showErrorNotification({
              title: t("certificate.action.create.notification.error.title"),
              message: t("certificate.action.create.notification.error.message"),
            });
          },
        });
      })}
    >
      <Stack>
        <FileInput leftSection={<IconCertificate size={16} />} {...form.getInputProps("file")} />
        <Group justify="end">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={form.submitting}>
            {t("common.action.add")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("certificate.action.create.label");
  },
});
