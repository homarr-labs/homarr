"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";

import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopUser } from "@homarr/workshop/schema";

import { createWorkshopClient } from "./workshop-client";

/**
 * Shared Workshop identity. Signing in is only needed to vote or report,
 * never to install, so every surface can render this without gating its content.
 */
export function useWorkshopSession() {
  const t = useScopedI18n("workshop");
  const client = useMemo(createWorkshopClient, []);
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);

  const signIn = () => {
    setPending(true);
    void client
      .signInWithGitHub()
      .then(setUser)
      .catch((cause: unknown) => {
        showErrorNotification({
          title: t("signIn"),
          message: cause instanceof Error ? cause.message : t("signInError"),
        });
      })
      .finally(() => setPending(false));
  };

  const signOut = () => {
    client.signOut();
    setUser(null);
  };

  return { client, user, pending, signIn, signOut };
}

export type WorkshopSession = ReturnType<typeof useWorkshopSession>;

export function WorkshopAccountButton({ session }: { session: WorkshopSession }) {
  const t = useScopedI18n("workshop");

  if (!session.user) {
    return (
      <Button
        variant="default"
        leftSection={<IconBrandGithub size={16} />}
        loading={session.pending}
        onClick={session.signIn}
      >
        {t("signIn")}
      </Button>
    );
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="sm" c="dimmed" lineClamp={1}>
        {session.user.name}
      </Text>
      <Button variant="subtle" color="gray" size="compact-sm" onClick={session.signOut}>
        {t("signOut")}
      </Button>
    </Group>
  );
}
