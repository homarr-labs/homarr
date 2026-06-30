import { Suspense } from "react";
import { UnstyledButton } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { UserAvatarMenu } from "~/components/user-avatar-menu";
import { UpdateIndicator } from "./update";

export const UserButton = async () => {
  const session = await auth();
  const isAdmin = session?.user.permissions.includes("admin");
  const isDockerEnabled = isAdmin && env.ENABLE_DOCKER;
  const availableUpdatesPromise = isAdmin ? api.updateChecker.getAvailableUpdates() : undefined;
  return (
    <UserAvatarMenu availableUpdatesPromise={availableUpdatesPromise} isDockerEnabled={isDockerEnabled}>
      <UnstyledButton>
        <Suspense fallback={<CurrentUserAvatar size="md" />}>
          <UpdateIndicator availableUpdatesPromise={availableUpdatesPromise} disabled={!isAdmin}>
            <CurrentUserAvatar size="md" />
          </UpdateIndicator>
        </Suspense>
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
