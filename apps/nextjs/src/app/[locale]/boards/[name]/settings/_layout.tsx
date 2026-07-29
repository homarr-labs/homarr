"use client";

import { Button, Fieldset, Group, Input, Slider, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getDesktopLayout } from "@homarr/boards/context";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutSchema } from "@homarr/validation/board";

import type { Board } from "../../_types";

interface Props {
  board: Board;
}
export const LayoutSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const desktopLayout = getDesktopLayout(board);
  const { mutate: saveLayout, isPending } = clientApi.board.saveLayout.useMutation({
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
    },
  });
  const form = useZodForm(boardSaveLayoutSchema.omit({ id: true }).required(), {
    initialValues: {
      columnCount: desktopLayout.columnCount,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        saveLayout({
          id: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <Fieldset legend={t("board.setting.section.layout.desktop.title")} bg="transparent">
          <Stack gap="sm">
            <Text c="dimmed" size="sm">
              {t("board.setting.section.layout.desktop.description")}
            </Text>
            <Input.Wrapper label={t("layout.field.columnCount.label")}>
              <Slider mt="xs" min={1} max={24} step={1} {...form.getInputProps("columnCount")} />
            </Input.Wrapper>
          </Stack>
        </Fieldset>

        <Text c="dimmed" size="sm">
          {t("board.setting.section.layout.mobile.description")}
        </Text>

        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
