"use client";

import { Button, Group, Stack, Switch } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}

export const BehaviorSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const { mutate: savePartialSettings, isPending } = useSavePartialSettingsMutation(board);
  const form = useForm({
    initialValues: {
      disableStatus: board.disableStatus,
      showInNavigation: board.showInNavigation ?? false,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        savePartialSettings({
          id: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <Switch
          label={t("board.field.disableStatus.label")}
          description={t("board.field.disableStatus.description")}
          {...form.getInputProps("disableStatus", { type: "checkbox" })}
        />

        {isAdmin && (
          <Switch
            label={t("board.field.showInNavigation.label")}
            description={t("board.field.showInNavigation.description")}
            {...form.getInputProps("showInNavigation", { type: "checkbox" })}
          />
        )}

        <Group justify="end">
          <Button type="submit" loading={isPending} color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
