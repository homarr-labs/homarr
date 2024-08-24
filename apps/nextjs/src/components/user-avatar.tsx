import type { MantineSize } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { UserAvatar } from "@homarr/ui";

interface UserAvatarProps {
  size: MantineSize;
}

export const CurrentUserAvatar = async ({ size }: UserAvatarProps) => {
  const currentSession = await auth();

  const user = {
    name: currentSession?.user.name ?? null,
    image: currentSession?.user.image ?? null,
  };

  return <UserAvatar user={user} size={size} />;
};
