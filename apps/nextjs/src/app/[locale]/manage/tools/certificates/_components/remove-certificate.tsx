"use client";

import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";

interface RemoveCertificateProps {
  fileName: string;
}

export const RemoveCertificate = ({ fileName }: RemoveCertificateProps) => {
  const { openConfirmModal } = useConfirmModal();
  const { mutateAsync } = clientApi.certificates.removeCertificate.useMutation();

  const handleClick = () => {
    openConfirmModal({
      title: "Remove certificate",
      children: "Are you sure you want to remove this certificate?",
      // eslint-disable-next-line no-restricted-syntax
      async onConfirm() {
        await mutateAsync(
          { fileName },
          {
            async onSuccess() {
              showSuccessNotification({
                title: "Certificate removed",
                message: "The certificate has been successfully removed.",
              });
              await revalidatePathActionAsync("/manage/tools/certificates");
            },
          },
        );
      },
    });
  };

  return (
    <ActionIcon onClick={handleClick} color="red" variant="subtle">
      <IconTrash color="red" size={16} />
    </ActionIcon>
  );
};
