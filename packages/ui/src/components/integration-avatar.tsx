import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";
import type { MantineRadius, MantineSize } from "@mantine/core";
import { Avatar } from "@mantine/core";

interface IntegrationAvatarProps {
  size: MantineSize;
  kind: IntegrationKind | null;
  radius?: MantineRadius;
}

export const IntegrationAvatar = ({ kind, size, radius }: IntegrationAvatarProps) => {
  const url = kind ? getIconUrl(kind) : null;
  if (!url) {
    return null;
  }

  return <Avatar size={size} src={url} radius={radius} styles={{ image: { objectFit: "contain" } }} />;
};
