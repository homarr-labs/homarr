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
  if (!user?.name) return <Avatar size={size} />;
  if (user.image) {
    return <Avatar src={user.image} alt={user.name} size={size} />;
  }

  return <Avatar name={user.name} color="initials" size={size}></Avatar>;
};
