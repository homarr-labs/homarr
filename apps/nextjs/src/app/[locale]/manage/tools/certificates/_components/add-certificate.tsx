"use client";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { AddCertificateModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";
import { Button } from "@mantine/core";

export const AddCertificateButton = () => {
  const { openModal } = useModalAction(AddCertificateModal);
  const t = useI18n();

  const handleClick = () => {
    openModal({
      async onSuccess() {
        await revalidatePathActionAsync("/manage/tools/certificates");
      },
    });
  };

  return <Button onClick={handleClick}>{t("certificate.action.create.label")}</Button>;
};
