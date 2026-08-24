"use client";

import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

interface RemoveHostnameActionIconProps {
  hostname: string;
  thumbprint: string;
}

export const RemoveHostnameActionIcon = (input: RemoveHostnameActionIconProps) => {
  const { mutateAsync, isPending } = clientApi.certificates.removeTrustedHostname.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/tools/certificates/hostnames");
    },
  });
  const t = useI18n("certificate");
  const tCommon = useI18n("common");

  const handleRemove = () =>
    mutateAsync(input, {
      onSuccess() {
        showSuccessNotification({
          title: t("action.removeHostname.notification.success.title"),
          message: t("action.removeHostname.notification.success.message"),
        });
      },
      onError() {
        showErrorNotification({
          title: t("action.removeHostname.notification.error.title"),
          message: t("action.removeHostname.notification.error.message"),
        });
      },
    });

  return (
    <InlineConfirmActionIcon
      onConfirm={handleRemove}
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      loading={isPending}
      color="red"
      variant="subtle"
      aria-label={t("action.removeHostname.label")}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
};
