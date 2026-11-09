"use client";

import { useEffect, useState } from "react";
import { Menu, NavLink, Text } from "@mantine/core";
import { IconArrowUpRight, IconBellRinging } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";

export const useAvailableUpdates = (isAdmin: boolean) => {
  const [canCheckForUpdates, setCanCheckForUpdates] = useState(false);
  const session = useSession();
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
    enabled: canCheckForUpdates && isCurrentSessionAdmin,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 60 * 60 * 1_000,
  });

  if (!isCurrentSessionAdmin) return undefined;
  return availableUpdates;
};

export const ManagementUpdateNavLink = ({ isAdmin }: { isAdmin: boolean }) => {
  const t = useI18n("management.navbar.items");
  const latestUpdate = useAvailableUpdates(isAdmin)?.at(0);
  if (!latestUpdate) return null;
  const label = t("updateAvailable");

  return (
    <NavLink
      component="a"
      href={latestUpdate.url}
      target="_blank"
      rel="noopener noreferrer"
      label={label}
      aria-label={`${label}: ${latestUpdate.tagName}`}
      leftSection={<IconArrowUpRight size={20} stroke={1.5} aria-hidden />}
      rightSection={
        <Text component="span" size="xs" truncate maw={90}>
          {latestUpdate.tagName}
        </Text>
      }
      color="gray"
      noWrap
    />
  );
};

interface AvailableUpdatesMenuItemProps {
  availableUpdates: RouterOutputs["updateChecker"]["getAvailableUpdates"] | undefined;
}

export const AvailableUpdatesMenuItem = ({ availableUpdates }: AvailableUpdatesMenuItemProps) => {
  const t = useI18n("common.userAvatar.menu");
  if (availableUpdates === undefined || availableUpdates.length === 0) {
    return null;
  }

  const latestUpdate = availableUpdates.at(0);
  if (!latestUpdate) return null;

  return (
    <>
      <Menu.Item component={"a"} href={latestUpdate.url} target="_blank" leftSection={<IconBellRinging size="1rem" />}>
        <Text fw="bold" size="sm">
          {t("updateAvailable", {
            countUpdates: String(availableUpdates.length),
            tag: latestUpdate.tagName,
          })}
        </Text>
      </Menu.Item>
      <Menu.Divider />
    </>
  );
};
