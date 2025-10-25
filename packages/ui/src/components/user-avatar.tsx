"use client";

import type { AvatarProps } from "@mantine/core";
import { Avatar } from "@mantine/core";
import { createHash } from "crypto";

export interface UserProps {
  name: string | null;
  image: string | null;
  email?: string | null;
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

  if (user.email) {
    const emailHash = createHash("md5").update(user.email.trim().toLowerCase()).digest("hex");
    return <Avatar src={`https://seccdn.libravatar.org/avatar/${emailHash}?d=404`} alt={user.name} size={size} />;
  }

  return <Avatar name={user.name} color="initials" size={size}></Avatar>;
};
