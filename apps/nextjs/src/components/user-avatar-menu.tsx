"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { Menu } from "@mantine/core";
import { IconBrandDocker, IconHome, IconLogin, IconLogout, IconSettings, IconTool } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { signOut, useSession } from "@homarr/auth/client";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useAuthContext } from "~/app/[locale]/_client-providers/session";
import { CurrentColorSchemeCombobox } from "./color-scheme/current-color-scheme-combobox";
import { CurrentLanguageCombobox } from "./language/current-language-combobox";
import { DockerQuickAccessModal } from "./layout/header/docker-quick-access-modal";
import { AvailableUpdatesMenuItem } from "./layout/header/update";

interface UserAvatarMenuProps {
  children: ReactNode;
  availableUpdates?: RouterOutputs["updateChecker"]["getAvailableUpdates"];
  isDockerEnabled?: boolean;
}

export const UserAvatarMenu = ({ children, availableUpdates, isDockerEnabled }: UserAvatarMenuProps) => {
  const t = useScopedI18n("common.userAvatar.menu");
  const session = useSession();

  const { logoutUrl } = useAuthContext();
  const { openModal: openDockerModal } = useModalAction(DockerQuickAccessModal);

  const handleSignout = useCallback(async () => {
    const redirectUrl = logoutUrl ?? "/auth/login";
    await signOut({
      redirect: false,
    });
    window.location.assign(redirectUrl);
  }, [logoutUrl]);

  return (
    // We use keepMounted so we can add event listeners to prevent navigating away without saving the board
    <Menu width={300} withinPortal keepMounted>
      <Menu.Dropdown>
        <AvailableUpdatesMenuItem availableUpdates={availableUpdates} />
        <Menu.Item component={Link} href="/boards" leftSection={<IconHome size="1rem" />}>
          {t("homeBoard")}
        </Menu.Item>
        <Menu.Divider />

        <Menu.Item p={0} closeMenuOnClick={false} component="div">
          <CurrentColorSchemeCombobox />
        </Menu.Item>
        <Menu.Item p={0} closeMenuOnClick={false} component="div">
          <CurrentLanguageCombobox />
        </Menu.Item>
        <Menu.Divider />
        {Boolean(session.data) && (
          <>
            <Menu.Item
              component={Link}
              href={`/manage/users/${session.data?.user.id}/general`}
              leftSection={<IconSettings size="1rem" />}
            >
              {t("preferences")}
            </Menu.Item>

            <Menu.Item component={Link} href="/manage" leftSection={<IconTool size="1rem" />}>
              {t("management")}
            </Menu.Item>
            {isDockerEnabled && (
              <Menu.Item leftSection={<IconBrandDocker size="1rem" />} onClick={() => openDockerModal()}>
                {t("docker")}
              </Menu.Item>
            )}
          </>
        )}
        <Menu.Divider />
        {session.status === "authenticated" ? (
          <Menu.Item onClick={handleSignout} leftSection={<IconLogout size="1rem" />} color="red">
            {t("logout")}
          </Menu.Item>
        ) : (
          <Menu.Item component={Link} href="/auth/login" leftSection={<IconLogin size="1rem" />}>
            {t("login")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
      <Menu.Target>{children}</Menu.Target>
    </Menu>
  );
};
