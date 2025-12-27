"use client";

import {
  Badge,
  Box,
  Button,
  Chip,
  ChipGroup,
  Fieldset,
  Grid,
  Group,
  Input,
  InputWrapper,
  NumberInput,
  RadioGroup,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { boardLayoutModes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { CustomRadioCard } from "@homarr/ui";
import { boardSaveLayoutsSchema } from "@homarr/validation/board";

import type { Board } from "../../_types";

interface Props {
  board: Board;
}
export const LayoutSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const { mutate: saveLayouts, isPending } = clientApi.board.saveLayouts.useMutation({
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
    },
  });
  const form = useZodForm(boardSaveLayoutsSchema.omit({ id: true }).required(), {
    initialValues: {
      layouts: board.layouts,
      layoutMode: board.layoutMode,
      baseLayoutId: board.baseLayoutId,
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
        <RadioGroup {...form.getInputProps("layoutMode")} label={t("board.field.layoutMode.label")}>
          <SimpleGrid cols={{ sm: 2, xs: 1 }} spacing="md">
            {boardLayoutModes.values.map((layoutMode) => (
              <Box w="100%" key={layoutMode} pos="relative">
                <CustomRadioCard
                  value={layoutMode}
                  label={t(`board.field.layoutMode.option.${layoutMode}.label`)}
                  description={t(`board.field.layoutMode.option.${layoutMode}.description`)}
                />
                {layoutMode === boardLayoutModes.defaultValue && (
                  <Badge pos="absolute" top="8px" right="8px" variant="light" size="sm">
                    {t("common.select.badge.recommended")}
                  </Badge>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </RadioGroup>

        {form.values.layoutMode === "auto" && (
          <InputWrapper label={t("board.field.baseLayout.label")} description={t("board.field.baseLayout.description")}>
            <ChipGroup {...form.getInputProps("baseLayoutId")} multiple={false}>
              <SimpleGrid
                cols={{
                  lg: Math.min(6, form.values.layouts.length),
                  sm: Math.min(4, form.values.layouts.length),
                  xs: Math.min(2, form.values.layouts.length),
                }}
                spacing="md"
                mt="sm"
              >
                {form.values.layouts.map((layout) => (
                  <Chip
                    key={layout.id}
                    value={layout.id}
                    w="100%"
                    size="sm"
                    styles={{ label: { width: "100%", justifyContent: "center" } }}
                  >
                    {layout.name}
                  </Chip>
                ))}
              </SimpleGrid>
            </ChipGroup>
          </InputWrapper>
        )}

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
                      name: "",
                      columnCount: 10,
                      breakpoint: 0,
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
                    <Slider mt="xs" min={1} max={24} step={1} {...form.getInputProps(`layouts.${index}.columnCount`)} />
                  </Input.Wrapper>
                </Grid.Col>

                <Grid.Col span={{ sm: 12, md: 6 }}>
                  <NumberInput
                    {...form.getInputProps(`layouts.${index}.breakpoint`)}
                    label={t("layout.field.breakpoint.label")}
                    description={t("layout.field.breakpoint.description")}
                  />
                </Grid.Col>
              </Grid>
              {form.values.layouts.length >= 2 && form.values.baseLayoutId !== layout.id && (
                <Group justify="end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      form.setValues((previous) => {
                        if (!previous.layouts) return previous;
                        if (previous.layouts.length < 2) return previous;
                        if (previous.baseLayoutId === layout.id) return previous;

                        return {
                          ...previous,
                          layouts: previous.layouts.filter((filteredLayout) => filteredLayout.id !== layout.id),
                        };
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
