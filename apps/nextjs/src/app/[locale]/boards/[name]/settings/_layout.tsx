"use client";

import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Button, Grid, Group, Input, Slider, Stack } from "@homarr/ui";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}
export const LayoutSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const { mutate: savePartialSettings, isPending } =
    useSavePartialSettingsMutation(board);
  const form = useForm({
    initialValues: {
      columnCount: board.columnCount,
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
        <Grid>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Input.Wrapper label={t("board.field.columnCount.label")}>
              <Slider
                mt="xs"
                min={1}
                max={24}
                step={1}
                {...form.getInputProps("columnCount")}
              />
            </Input.Wrapper>
          </Grid.Col>
        </Grid>
        <Group justify="end">
          <Button type="submit" loading={isPending} color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
