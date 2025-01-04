"use client";

import type { JSX } from "react";
import { Button, FileButton } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { MaybePromise } from "@homarr/common/types";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { supportedMediaUploadFormats } from "@homarr/validation";

export const UploadMediaButton = () => {
  const t = useI18n();
  const onSettledAsync = async () => {
    await revalidatePathActionAsync("/manage/medias");
  };

  return (
    <UploadMedia onSettled={onSettledAsync}>
      {({ onClick, loading }) => (
        <Button onClick={onClick} loading={loading} rightSection={<IconUpload size={16} stroke={1.5} />}>
          {t("media.action.upload.label")}
        </Button>
      )}
    </UploadMedia>
  );
};

interface UploadMediaProps {
  children: (props: { onClick: () => void; loading: boolean }) => JSX.Element;
  onSettled?: () => MaybePromise<void>;
  onSuccess?: (media: { id: string; url: string }) => MaybePromise<void>;
}

export const UploadMedia = ({ children, onSettled, onSuccess }: UploadMediaProps) => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.media.uploadMedia.useMutation();

  const handleFileUploadAsync = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await mutateAsync(formData, {
      async onSuccess(mediaId) {
        showSuccessNotification({
          message: t("media.action.upload.notification.success.message"),
        });
        await onSuccess?.({
          id: mediaId,
          url: `/api/user-medias/${mediaId}`,
        });
      },
      onError() {
        showErrorNotification({
          message: t("media.action.upload.notification.error.message"),
        });
      },
      async onSettled() {
        await onSettled?.();
      },
    });
  };

  return (
    <FileButton onChange={handleFileUploadAsync} accept={supportedMediaUploadFormats.join(",")}>
      {({ onClick }) => children({ onClick, loading: isPending })}
    </FileButton>
  );
};
