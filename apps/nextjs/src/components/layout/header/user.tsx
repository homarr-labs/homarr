import { UnstyledButton } from "@mantine/core";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { UserAvatarMenu } from "~/components/user-avatar-menu";

export const UserButton = () => {
  return (
    <UserAvatarMenu>
      <UnstyledButton>
        <CurrentUserAvatar size="md" />
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
