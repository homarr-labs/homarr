"use client";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import {
  Button,
  Checkbox,
  Fieldset,
  Grid,
  Group,
  Input,
  Slider,
  Stack,
} from "@homarr/ui";

import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}
export const LayoutSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const { mutate: savePartialSettings, isPending } =
    useSavePartialSettingsMutation(board);
  const form = useForm({
    initialValues: {
      showRightSidebar: board.showRightSidebar,
      showLeftSidebar: board.showLeftSidebar,
      columnCount: board.columnCount,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        savePartialSettings(
          {
            boardId: board.id,
            ...values,
          },
          {
            onSuccess: () => {
              void utils.board.byName.invalidate({ name: board.name });
              void utils.board.default.invalidate();
            },
          },
        );
      })}
    >
      <Stack>
        <Grid>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Fieldset legend="Sidebar">
              <Stack>
                <Checkbox
                  label="Left sidebar enabled"
                  {...form.getInputProps("showLeftSidebar", {
                    type: "checkbox",
                  })}
                />
                <Checkbox
                  label="Right sidebar enabled"
                  {...form.getInputProps("showRightSidebar", {
                    type: "checkbox",
                  })}
                />
              </Stack>
            </Fieldset>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Input.Wrapper label="Column count">
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
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
