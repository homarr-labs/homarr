import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { CurrentUserAvatar } from "~/components/user-avatar";
import type { BoardSwitcherControls } from "~/components/board/board-switcher";
import { UserButtonClient } from "./user-client";

export const UserButton = async ({ boardSwitcher }: { boardSwitcher: BoardSwitcherControls }) => {
  const session = await auth();
  const isAdmin = Boolean(session?.user.permissions.includes("admin"));
  const isDockerEnabled = isAdmin && env.ENABLE_DOCKER;
  return (
    <UserButtonClient
      avatar={<CurrentUserAvatar size="md" />}
      isAdmin={isAdmin}
      isDockerEnabled={isDockerEnabled}
      boardSwitcher={boardSwitcher}
    />
  );
};
