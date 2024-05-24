import { UnstyledButton } from "@mantine/core";

import { UserAvatar } from "~/components/user-avatar";
import { UserAvatarMenu } from "~/components/user-avatar-menu";

export const UserButton = () => {
  return (
    <UserAvatarMenu>
      <UnstyledButton>
        <UserAvatar size="md" />
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
