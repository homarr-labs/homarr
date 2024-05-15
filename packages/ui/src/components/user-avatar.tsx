import type { AvatarProps } from "@mantine/core";
import { Avatar } from "@mantine/core";

export interface UserProps {
  name: string | null;
  image: string | null;
}

interface UserAvatarProps {
  user: UserProps | null;
  size: AvatarProps["size"];
}

export const UserAvatar = ({ user, size }: UserAvatarProps) => {
  const commonProps = {
    size,
    color: "primaryColor",
  } satisfies Partial<AvatarProps>;

  if (!user?.name) return <Avatar {...commonProps} />;
  if (user.image) {
    return <Avatar {...commonProps} src={user.image} alt={user.name} />;
  }

  return (
    <Avatar {...commonProps}>{user.name.substring(0, 2).toUpperCase()}</Avatar>
  );
};
