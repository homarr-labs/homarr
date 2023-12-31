import { getIconUrl } from "@homarr/db/schema/items";
import type { IntegrationKind } from "@homarr/db/schema/items";
import { Avatar } from "@homarr/ui";
import type { MantineSize } from "@homarr/ui";

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
