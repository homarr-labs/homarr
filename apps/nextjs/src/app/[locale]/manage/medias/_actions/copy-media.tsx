"use client";

import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

interface CopyMediaProps {
  media: RouterOutputs["media"]["getPaginated"]["items"][number];
}

export const CopyMedia = ({ media }: CopyMediaProps) => {
  const t = useI18n("media");
  const label = t("action.copy.labelNamed", { name: media.name });

  const url = typeof window !== "undefined" ? `${window.location.origin}/api/user-medias/${media.id}` : "";

  // Clipboard only works on localhost or secure connections (https)
  if (url.startsWith("http://") && !url.startsWith("http://localhost")) {
    return null;
  }

  return (
    <CopyButton value={url}>
      {({ copy, copied }) => (
        <Tooltip label={label} openDelay={500}>
          <ActionIcon aria-label={label} onClick={copy} color={copied ? "teal" : "gray"} variant="subtle">
            {copied ? <IconCheck size={16} stroke={1.5} /> : <IconCopy size={16} stroke={1.5} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
};
