"use client";

import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface RemoveHostnameActionIconProps {
  hostname: string;
  thumbprint: string;
}

export const RemoveHostnameActionIcon = (input: RemoveHostnameActionIconProps) => {
  const { mutateAsync } = clientApi.certificates.removeTrustedHostname.useMutation();
  const { openConfirmModal } = useConfirmModal();
  const t = useI18n();

  const handleRemove = () => {
    openConfirmModal({
      title: "Remove trusted hostname",
      children:
        "Are you sure you want to remove this trusted hostname? This can cause some integrations to stop working.",
      // eslint-disable-next-line no-restricted-syntax
      async onConfirm() {
        await mutateAsync(input, {
          async onSuccess() {
            await revalidatePathActionAsync("/manage/tools/certificates/hostnames");
            showSuccessNotification({
              title: "Trusted hostname removed",
              message: "Removed the trusted hostname successfully",
            });
          },
          onError() {
            showErrorNotification({
              message: "Failed to remove the trusted hostname",
            });
          },
        });
      },
    });
  };

  return (
    <ActionIcon color="red" variant="subtle" onClick={handleRemove}>
      <IconTrash color="red" size={16} stroke={1.5} />
    </ActionIcon>
  );
};
