import { Avatar } from "@mantine/core";
import type { AvatarProps, MantineSize } from "@mantine/core";

export interface UserProps {
  name: string | null;
  image: string | null;
}

interface UserAvatarProps {
  user: UserProps | null;
  size: MantineSize;
}

export const UserAvatar = ({ user, size }: UserAvatarProps) => {
  const commonProps = {
    size,
    color: "primaryColor", // TODO: change to custom color specific to the user?
  } satisfies Partial<AvatarProps>;

  if (!user?.name) return <Avatar {...commonProps} />;
  if (user.image) {
    return <Avatar {...commonProps} src={user.image} alt={user.name} />;
  }

  return (
    <Avatar {...commonProps}>{user.name.substring(0, 2).toUpperCase()}</Avatar>
  );
};
