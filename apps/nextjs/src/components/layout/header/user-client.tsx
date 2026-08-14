"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { UnstyledButton, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";

import { UserAvatarMenu } from "~/components/user-avatar-menu";
import { UpdateIndicator } from "./update";

interface UserButtonClientProps {
  avatar: ReactNode;
  isAdmin: boolean;
  isDockerEnabled: boolean;
}

export const UserButtonClient = ({ avatar, isAdmin, isDockerEnabled }: UserButtonClientProps) => {
  const [canCheckForUpdates, setCanCheckForUpdates] = useState(false);
  const session = useSession();
  const { toggleColorScheme } = useMantineColorScheme();
  useHotkeys([[hotkeys.toggleColorScheme, toggleColorScheme]]);
  const isCurrentSessionAdmin =
    isAdmin && session.status === "authenticated" && session.data.user.permissions.includes("admin");

  useEffect(() => {
    if (!isCurrentSessionAdmin) {
      setCanCheckForUpdates(false);
      return;
    }

    const timeout = window.setTimeout(() => setCanCheckForUpdates(true), 2_000);
    return () => window.clearTimeout(timeout);
  }, [isCurrentSessionAdmin]);

  const { data: availableUpdates } = clientApi.updateChecker.getAvailableUpdates.useQuery(undefined, {
    enabled: canCheckForUpdates,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 60 * 60 * 1_000,
  });
  const visibleUpdates = isCurrentSessionAdmin ? availableUpdates : undefined;

  return (
    <UserAvatarMenu availableUpdates={visibleUpdates} isDockerEnabled={isDockerEnabled}>
      <UnstyledButton>
        <UpdateIndicator availableUpdates={visibleUpdates} disabled={!isCurrentSessionAdmin}>
          {avatar}
        </UpdateIndicator>
      </UnstyledButton>
    </UserAvatarMenu>
  );
};
