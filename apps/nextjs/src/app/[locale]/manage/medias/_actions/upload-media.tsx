"use client";

import { Button, FileButton } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { supportedMediaUploadFormats } from "@homarr/validation";

export const UploadMedia = () => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.media.uploadMedia.useMutation();

  const handleFileUploadAsync = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await mutateAsync(formData, {
      onSuccess() {
        showSuccessNotification({
          message: t("media.action.upload.notification.success.message"),
        });
      },
      onError() {
        showErrorNotification({
          message: t("media.action.upload.notification.error.message"),
        });
      },
      async onSettled() {
        await revalidatePathActionAsync("/manage/medias");
      },
    });
  };

  return (
    <FileButton onChange={handleFileUploadAsync} accept={supportedMediaUploadFormats.join(",")}>
      {({ onClick }) => (
        <Button onClick={onClick} loading={isPending} rightSection={<IconUpload size={16} stroke={1.5} />}>
          {t("media.action.upload.label")}
        </Button>
      )}
    </FileButton>
  );
};
