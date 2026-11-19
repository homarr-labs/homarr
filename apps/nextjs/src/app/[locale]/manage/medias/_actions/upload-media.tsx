"use client";

import { Button } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { UploadMedia } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";
import { supportedMediaUploadFormats } from "@homarr/validation/media";

export const UploadMediaButton = () => {
  const t = useI18n("media");
  const onSettledAsync = async () => {
    await revalidatePathActionAsync("/manage/medias");
  };

  return (
    <UploadMedia onSettled={onSettledAsync} accept={supportedMediaUploadFormats} multiple>
      {({ onClick, loading }) => (
        <Button onClick={onClick} loading={loading} rightSection={<IconUpload size={16} stroke={1.5} />}>
          {t("action.upload.label")}
        </Button>
      )}
    </UploadMedia>
  );
};
