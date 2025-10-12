import type { MantineSize } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { UserAvatar, UserProps } from "@homarr/ui";

interface CurrentUserAvatarProps {
  size: MantineSize;
}

export const CurrentUserAvatar = async ({ size }: CurrentUserAvatarProps) => {
  const currentSession = await auth();

  const user: UserProps = {
    name: currentSession?.user.name ?? null,
    image: currentSession?.user.image ?? null,
    email: currentSession?.user.email ?? null,
  };

  return <UserAvatar user={user} size={size} />;
};
