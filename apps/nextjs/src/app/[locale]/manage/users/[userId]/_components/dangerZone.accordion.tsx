"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, Divider, Group, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

interface DangerZoneAccordionProps {
  user: NonNullable<RouterOutputs["user"]["getById"]>;
}

export const DangerZoneAccordion = ({ user }: DangerZoneAccordionProps) => {
  const t = useScopedI18n("management.page.user.edit.section.dangerZone");
  const router = useRouter();
  const { mutateAsync: mutateUserDeletionAsync } =
    clientApi.user.delete.useMutation({
      onSettled: () => {
        router.push("/manage/users");
      },
    });

  const handleDelete = React.useCallback(
    async () => await mutateUserDeletionAsync(user.id),
    [user, mutateUserDeletionAsync],
  );

  return (
    <Stack>
      <Divider />
      <Group justify="space-between" px="md">
        <Stack gap={0}>
          <Text fw="bold" size="sm">
            {t("action.delete.label")}
          </Text>
          <Text size="sm">{t("action.delete.description")}</Text>
        </Stack>
        <Button onClick={handleDelete} variant="subtle" color="red">
          {t("action.delete.button")}
        </Button>
      </Group>
    </Stack>
  );
};
