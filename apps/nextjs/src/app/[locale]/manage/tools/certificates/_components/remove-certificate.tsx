"use client";

import { IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

interface RemoveCertificateProps {
  fileName: string;
}

export const RemoveCertificate = ({ fileName }: RemoveCertificateProps) => {
  const { mutateAsync, isPending } = clientApi.certificates.removeCertificate.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/tools/certificates");
    },
  });
  const t = useI18n("certificate");
  const tCommon = useI18n("common");

  const handleRemove = () =>
    mutateAsync(
      { fileName },
      {
        onSuccess() {
          showSuccessNotification({
            title: t("action.remove.notification.success.title"),
            message: t("action.remove.notification.success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: t("action.remove.notification.error.title"),
            message: t("action.remove.notification.error.message"),
          });
        },
      },
    );

  return (
    <InlineConfirmActionIcon
      onConfirm={handleRemove}
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      loading={isPending}
      color="red"
      variant="subtle"
      aria-label={t("action.remove.label")}
    >
      <IconTrash color="red" size={16} />
    </InlineConfirmActionIcon>
  );
};
