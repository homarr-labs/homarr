import type { MantineSize } from "@mantine/core";
import { Avatar } from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";

interface IntegrationAvatarProps {
  size: MantineSize;
  kind: IntegrationKind | null;
}

export const IntegrationAvatar = ({ kind, size }: IntegrationAvatarProps) => {
  const url = kind ? getIconUrl(kind) : null;
  if (!url) {
    return null;
  }

  return <Avatar size={size} src={url} />;
};
