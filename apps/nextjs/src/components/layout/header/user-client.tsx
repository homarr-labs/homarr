"use client";

import type { ComponentProps, ReactNode } from "react";
import { Suspense, use, useEffect, useState } from "react";
import { Box, Loader, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { ErrorBoundary } from "react-error-boundary";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";

import { UpdateIndicator } from "./update";

type UserAvatarMenuModule = typeof import("~/components/user-avatar-menu");
type UserAvatarMenuProps = ComponentProps<UserAvatarMenuModule["UserAvatarMenu"]>;

let userAvatarMenuPromise: Promise<UserAvatarMenuModule> | undefined;
const loadUserAvatarMenu = () => {
  if (userAvatarMenuPromise) return userAvatarMenuPromise;

  const promise = import("~/components/user-avatar-menu");
  userAvatarMenuPromise = promise;
  void promise.catch(() => {
    if (userAvatarMenuPromise === promise) userAvatarMenuPromise = undefined;
  });
  return promise;
};
const preloadUserAvatarMenu = () => void loadUserAvatarMenu().catch(() => undefined);

const LazyUserAvatarMenu = (props: UserAvatarMenuProps) => {
  const { UserAvatarMenu } = use(loadUserAvatarMenu());
  return <UserAvatarMenu {...props} />;
};

interface UserButtonClientProps {
  avatar: ReactNode;
  isAdmin: boolean;
  isDockerEnabled: boolean;
}

export const UserButtonClient = ({ avatar, isAdmin, isDockerEnabled }: UserButtonClientProps) => {
  const [canCheckForUpdates, setCanCheckForUpdates] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  const openMenu = () => {
    setIsMenuMounted(true);
    setIsMenuOpen(true);
  };
  const renderButton = (onClick: () => void, isLoading = false) => (
    <UnstyledButton
      onClick={onClick}
      onFocus={preloadUserAvatarMenu}
      onMouseEnter={preloadUserAvatarMenu}
      onPointerDown={preloadUserAvatarMenu}
      aria-busy={isLoading || undefined}
      disabled={isLoading}
    >
      <UpdateIndicator availableUpdates={visibleUpdates} disabled={!isCurrentSessionAdmin}>
        <Box pos="relative" style={{ display: "inline-flex" }}>
          <Box opacity={isLoading ? 0.35 : 1}>{avatar}</Box>
          {isLoading && (
            <Loader
              aria-label="Loading user menu"
              size={18}
              pos="absolute"
              top="50%"
              left="50%"
              style={{ transform: "translate(-50%, -50%)" }}
            />
          )}
        </Box>
      </UpdateIndicator>
    </UnstyledButton>
  );
  const button = renderButton(openMenu);
  const loadingButton = renderButton(() => undefined, true);

  if (!isMenuMounted) return button;

  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) =>
        renderButton(() => {
          resetErrorBoundary();
          openMenu();
        })
      }
    >
      <Suspense fallback={loadingButton}>
        <LazyUserAvatarMenu
          availableUpdates={visibleUpdates}
          isDockerEnabled={isDockerEnabled}
          opened={isMenuOpen}
          onOpenChange={setIsMenuOpen}
        >
          {button}
        </LazyUserAvatarMenu>
      </Suspense>
    </ErrorBoundary>
  );
};
