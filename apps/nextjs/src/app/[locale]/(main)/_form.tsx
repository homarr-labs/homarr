"use client";

import { Button, FileButton } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

export const MediaForm = () => {
  const { mutate } = clientApi.media.uploadMedia.useMutation();

  return (
    <FileButton
      onChange={(file) => {
        if (!file) {
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        mutate(formData);
      }}
    >
      {(props) => <Button {...props}>Upload image</Button>}
    </FileButton>
  );
};
