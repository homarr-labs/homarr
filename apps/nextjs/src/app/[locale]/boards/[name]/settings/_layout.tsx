"use client";

import { Button, Fieldset, Grid, Group, Input, NumberInput, Slider, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getDesktopLayout } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutSchema, boardSaveLayoutsSchema } from "@homarr/validation/board";

import type { Board } from "../../_types";

interface Props {
  board: Board;
  enableAutomaticMobileLayout: boolean;
}

const getNextAvailableBreakpoint = (layouts: Array<{ breakpoint: number }>) => {
  const breakpoints = new Set(layouts.map((layout) => layout.breakpoint));
  const commonBreakpoints = [0, 480, 768, 1024, 1200, 1440, 1920];
  const commonBreakpoint = commonBreakpoints.find((breakpoint) => !breakpoints.has(breakpoint));
  if (commonBreakpoint !== undefined) return commonBreakpoint;

  for (let breakpoint = 0; breakpoint <= 32767; breakpoint++) {
    if (!breakpoints.has(breakpoint)) return breakpoint;
  }

  throw new Error("No responsive layout breakpoints are available");
};

export const LayoutSettingsContent = ({ board, enableAutomaticMobileLayout }: Props) =>
  enableAutomaticMobileLayout ? (
    <AutomaticLayoutSettingsContent board={board} />
  ) : (
    <ResponsiveLayoutSettingsContent board={board} />
  );

const AutomaticLayoutSettingsContent = ({ board }: Pick<Props, "board">) => {
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
              <Slider
                mt="xs"
                min={1}
                max={24}
                step={1}
                thumbLabel={t("layout.field.columnCount.label")}
                {...form.getInputProps("columnCount")}
              />
            </Input.Wrapper>
          </Stack>
        </Fieldset>

        <Text c="dimmed" size="sm">
          {t("board.setting.section.layout.mobile.automaticDescription")}
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

const ResponsiveLayoutSettingsContent = ({ board }: Pick<Props, "board">) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const form = useZodForm(boardSaveLayoutsSchema.omit({ id: true }).required(), {
    initialValues: {
      layouts: board.layouts,
    },
  });
  const { mutate: saveLayouts, isPending } = clientApi.board.saveLayouts.useMutation({
    onSuccess(layouts) {
      const values = { layouts };
      form.setValues(values);
      form.resetDirty(values);
    },
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        saveLayouts({
          id: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <Text c="dimmed" size="sm">
          {t("board.setting.section.layout.responsive.description")}
        </Text>
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text fw={500}>{t("board.setting.section.layout.responsive.title")}</Text>
            <Button
              variant="subtle"
              onClick={() => {
                form.setValues({
                  layouts: [
                    ...form.values.layouts,
                    {
                      id: createId(),
                      name: t("board.setting.section.layout.responsive.defaultName"),
                      columnCount: 10,
                      breakpoint: getNextAvailableBreakpoint(form.values.layouts),
                    },
                  ],
                });
              }}
            >
              {t("board.setting.section.layout.responsive.action.add")}
            </Button>
          </Group>

          {form.values.layouts.map((layout, index) => (
            <Fieldset key={layout.id} legend={layout.name} bg="transparent">
              <Grid>
                <Grid.Col span={{ sm: 12, md: 6 }}>
                  <TextInput {...form.getInputProps(`layouts.${index}.name`)} label={t("layout.field.name.label")} />
                </Grid.Col>

                <Grid.Col span={{ sm: 12, md: 6 }}>
                  <Input.Wrapper label={t("layout.field.columnCount.label")}>
                    <Slider
                      mt="xs"
                      min={1}
                      max={24}
                      step={1}
                      thumbLabel={t("layout.field.columnCount.label")}
                      {...form.getInputProps(`layouts.${index}.columnCount`)}
                    />
                  </Input.Wrapper>
                </Grid.Col>

                <Grid.Col span={{ sm: 12, md: 6 }}>
                  <NumberInput
                    {...form.getInputProps(`layouts.${index}.breakpoint`)}
                    label={t("layout.field.breakpoint.label")}
                    description={t("layout.field.breakpoint.description")}
                    min={0}
                    max={32767}
                    allowDecimal={false}
                    allowNegative={false}
                  />
                </Grid.Col>
              </Grid>
              {form.values.layouts.length >= 2 && (
                <Group justify="end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      form.setValues((previous) => {
                        const previousLayouts = previous.layouts ?? [];
                        return previousLayouts.length >= 2
                          ? {
                              layouts: previousLayouts.filter((filteredLayout) => filteredLayout.id !== layout.id),
                            }
                          : previous;
                      });
                    }}
                  >
                    {t("common.action.remove")}
                  </Button>
                </Group>
              )}
            </Fieldset>
          ))}
        </Stack>

        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
