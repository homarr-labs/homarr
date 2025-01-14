"use client";

import { Button, FileInput, Group, Stack } from "@mantine/core";
import { IconCertificate } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { superRefineCertificateFile, z } from "@homarr/validation";

export const AddCertificateButton = () => {
  const { openModal } = useModalAction(AddCertificateModal);

  const handleClick = () => {
    openModal({});
  };

  return <Button onClick={handleClick}>Add certificate</Button>;
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
              title: "Certificate added",
              message: "The certificate has been successfully added.",
            });
            await revalidatePathActionAsync("/manage/tools/certificates");
            actions.closeModal();
          },
          onError() {
            showErrorNotification({
              title: "Failed to add certificate",
              message: "An error occurred while adding the certificate.",
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
  defaultTitle: "Add certificate",
});
