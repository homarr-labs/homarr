import { getIconUrl } from "@homarr/db/schema/items";
import type { IntegrationSort } from "@homarr/db/schema/items";
import { Avatar } from "@homarr/ui";
import type { MantineSize } from "@homarr/ui";

interface IntegrationAvatarProps {
  size: MantineSize;
  sort: IntegrationSort | null;
}

export const IntegrationAvatar = ({
  sort: integration,
  size,
}: IntegrationAvatarProps) => {
  const url = integration ? getIconUrl(integration) : null;
  if (!url) {
    return null;
  }

  return <Avatar size={size} src={url} />;
};
