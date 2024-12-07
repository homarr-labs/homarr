import { Indicator, UnstyledButton } from "@mantine/core";

import { api } from "@homarr/api/server";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { UserAvatarMenu } from "~/components/user-avatar-menu";

export const UserButton = async () => {
  const data = await api.updateChecker.getAvailableUpdates();
  return (
    <UserAvatarMenu availableUpdates={data}>
      <UnstyledButton>
        <Indicator disabled={!data || data.length === 0} size={15} processing withBorder>
          <CurrentUserAvatar size="md" />
        </Indicator>
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
