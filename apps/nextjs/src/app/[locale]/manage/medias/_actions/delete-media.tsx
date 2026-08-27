"use client";

import { Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

interface DeleteMediaProps {
  media: RouterOutputs["media"]["getPaginated"]["items"][number];
}

export const DeleteMedia = ({ media }: DeleteMediaProps) => {
  const t = useI18n("media");
  const tCommon = useI18n("common");
  const { mutateAsync, isPending } = clientApi.media.deleteMedia.useMutation();

  const onConfirm = async () => {
    await mutateAsync({ id: media.id });
    await revalidatePathActionAsync("/manage/medias");
  };

  return (
    <Tooltip label={t("action.delete.label")} openDelay={500}>
      <InlineConfirmActionIcon
        color="red"
        variant="subtle"
        onConfirm={onConfirm}
        confirmLabel={tCommon("action.confirm")}
        confirmationAriaLabel={tCommon("action.confirm")}
        loading={isPending}
        aria-label={t("action.delete.label")}
      >
        <IconTrash color="red" size={16} stroke={1.5} />
      </InlineConfirmActionIcon>
    </Tooltip>
  );
};
