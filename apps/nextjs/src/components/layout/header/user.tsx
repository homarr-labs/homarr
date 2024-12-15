import { Indicator, UnstyledButton } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { UserAvatarMenu } from "~/components/user-avatar-menu";

export const UserButton = async () => {
  const data = await api.updateChecker.getAvailableUpdates();
  const session = await auth();
  const isAdmin = session?.user.permissions.includes("admin");
  return (
    <UserAvatarMenu availableUpdates={isAdmin ? data : undefined}>
      <UnstyledButton>
        <Indicator disabled={data.length === 0 || !isAdmin} size={15} processing withBorder>
          <CurrentUserAvatar size="md" />
        </Indicator>
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
