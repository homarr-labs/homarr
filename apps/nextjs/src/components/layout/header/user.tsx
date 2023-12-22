import { UnstyledButton } from "@homarr/ui";

import { UserAvatar } from "~/components/user-avatar";

export const UserButton = () => {
  return (
    <UnstyledButton>
      <UserAvatar size="md" />
    </UnstyledButton>
  );
};
