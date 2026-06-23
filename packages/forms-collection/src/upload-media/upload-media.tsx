import type { JSX } from "react";
import { FileButton } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { MaybePromise } from "@homarr/common/types";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { supportedImageUploadFormats } from "@homarr/validation/media";

interface UploadMediaProps {
  children: (props: { onClick: () => void; loading: boolean }) => JSX.Element;
  accept?: string[];
  multiple?: boolean;
  onSettled?: () => MaybePromise<void>;
  onSuccess?: (media: { id: string; url: string }[]) => MaybePromise<void>;
}

export const UploadMedia = ({
  accept = supportedImageUploadFormats,
  children,
  onSettled,
  onSuccess,
  multiple = false,
}: UploadMediaProps) => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.media.uploadMedia.useMutation({
    async onSettled() {
      await onSettled?.();
    },
  });

  const handleFileUploadAsync = async (files: File[] | File | null) => {
    if (!files || (Array.isArray(files) && files.length === 0)) return;
    const filesArray: File[] = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    filesArray.forEach((file) => formData.append("files", file));
    const mediaIds = await mutateAsync(formData, {
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
    });
    await onSuccess?.(
      mediaIds.map((id, index) => ({
        id,
        url: createUploadedMediaUrl(id, filesArray[index]),
      })),
    );
  };

  return (
    <FileButton onChange={handleFileUploadAsync} accept={accept.join(",")} multiple={multiple}>
      {({ onClick }) => children({ onClick, loading: isPending })}
    </FileButton>
  );
};

const createUploadedMediaUrl = (id: string, file: File | undefined) => {
  const extension = file?.name.match(/\.[^./\\]+$/)?.[0].toLowerCase() ?? "";
  return `/api/user-medias/${id}${extension}`;
};
