"use client";

import { useRouter } from "next/navigation";

import { useScopedI18n } from "@homarr/translation/client";
import { Button, Divider, Group, Stack, Text } from "@homarr/ui";

import { modalEvents } from "~/app/[locale]/modals";
import type { Board } from "../../_types";

interface Props {
  board: Board;
}

export const DangerZoneSettingsContent = ({ board }: Props) => {
  const t = useScopedI18n("board.setting");
  const router = useRouter();

  return (
    <Stack gap="sm">
      <Divider />
      <Group justify="space-between" px="md">
        <Stack gap={0}>
          <Text fw="bold" size="sm">
            {t("section.dangerZone.action.rename.label")}
          </Text>
          <Text size="sm">
            {t("section.dangerZone.action.rename.description")}
          </Text>
        </Stack>
        <Button
          variant="subtle"
          color="red"
          onClick={() =>
            modalEvents.openManagedModal({
              modal: "boardRenameModal",
              innerProps: {
                id: board.id,
                previousName: board.name,
                onSuccess: (name) => {
                  router.push(`/boards/${name}/settings`);
                },
              },
            })
          }
        >
          {t("section.dangerZone.action.rename.button")}
        </Button>
      </Group>
      <Divider />
      <Group justify="space-between" px="md">
        <Stack gap={0}>
          <Text fw="bold" size="sm">
            {t("section.dangerZone.action.visibility.label")}
          </Text>
          <Text size="sm">
            {t("section.dangerZone.action.visibility.description.private")}
          </Text>
        </Stack>
        <Button variant="subtle" color="red">
          {t("section.dangerZone.action.visibility.button.private")}
        </Button>
      </Group>
      <Divider />
      <Group justify="space-between" px="md">
        <Stack gap={0}>
          <Text fw="bold" size="sm">
            {t("section.dangerZone.action.delete.label")}
          </Text>
          <Text size="sm">
            {t("section.dangerZone.action.delete.description")}
          </Text>
        </Stack>
        <Button variant="subtle" color="red">
          {t("section.dangerZone.action.delete.button")}
        </Button>
      </Group>
    </Stack>
  );
};
