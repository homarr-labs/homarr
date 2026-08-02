"use client";

import {
  Box,
  Button,
  Fieldset,
  Grid,
  Group,
  Input,
  NumberInput,
  Paper,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutsSchema } from "@homarr/validation/board";

import type { Board } from "../../_types";
import classes from "./_layout.module.css";

const layoutSettingsSchema = boardSaveLayoutsSchema.omit({ id: true });

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
  const form = useZodForm(layoutSettingsSchema, {
    initialValues: {
      layouts: board.layouts,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        saveLayouts({
          id: board.id,
          layouts: values.layouts,
        });
      })}
    >
      <Stack>
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
                      leftGutterColumnCount: 0,
                      rightGutterColumnCount: 0,
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
                    <Slider
                      mt="xs"
                      min={1}
                      max={24}
                      step={1}
                      value={layout.columnCount}
                      thumbLabel={t("layout.field.columnCount.label")}
                      onChange={(columnCount) => {
                        const left = Math.min(layout.leftGutterColumnCount, Math.max(0, columnCount - 1));
                        const right = Math.min(layout.rightGutterColumnCount, Math.max(0, columnCount - left - 1));
                        form.setFieldValue(`layouts.${index}.columnCount`, columnCount);
                        form.setFieldValue(`layouts.${index}.leftGutterColumnCount`, left);
                        form.setFieldValue(`layouts.${index}.rightGutterColumnCount`, right);
                      }}
                    />
                  </Input.Wrapper>
                </Grid.Col>

                <Grid.Col span={{ sm: 12, md: 6 }}>
                  <NumberInput
                    {...form.getInputProps(`layouts.${index}.breakpoint`)}
                    label={t("layout.field.breakpoint.label")}
                    description={t("layout.field.breakpoint.description")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <GutterSettings
                    left={layout.leftGutterColumnCount}
                    right={layout.rightGutterColumnCount}
                    columnCount={layout.columnCount}
                    onLeftChange={(value) => form.setFieldValue(`layouts.${index}.leftGutterColumnCount`, value)}
                    onRightChange={(value) => form.setFieldValue(`layouts.${index}.rightGutterColumnCount`, value)}
                  />
                </Grid.Col>
              </Grid>
              {form.values.layouts.length >= 2 && (
                <Group justify="end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      form.setValues((previous) =>
                        previous.layouts !== undefined && previous.layouts.length >= 2
                          ? {
                              layouts: form.values.layouts.filter((filteredLayout) => filteredLayout.id !== layout.id),
                            }
                          : previous,
                      );
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

interface GutterSettingsProps {
  left: number;
  right: number;
  columnCount: number;
  onLeftChange: (value: number) => void;
  onRightChange: (value: number) => void;
}

const gutterMarks = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

const GutterSettings = ({ left, right, columnCount, onLeftChange, onRightChange }: GutterSettingsProps) => {
  const t = useI18n();
  const maxGutterWidth = Math.min(3, Math.max(1, columnCount - 1));

  return (
    <Paper className={classes.gutterSettings} p="md">
      <Stack gap="md">
        <Box>
          <Text fw={600}>{t("layout.field.gutters.label")}</Text>
          <Text size="sm" c="dimmed">
            {t("layout.field.gutters.description")}
          </Text>
        </Box>

        <GutterPreview left={left} right={right} columnCount={columnCount} />

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <GutterControl
              side="left"
              value={left}
              max={Math.min(maxGutterWidth, columnCount - right - 1)}
              onChange={onLeftChange}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <GutterControl
              side="right"
              value={right}
              max={Math.min(maxGutterWidth, columnCount - left - 1)}
              onChange={onRightChange}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Paper>
  );
};

const GutterControl = ({
  side,
  value,
  max,
  onChange,
}: {
  side: "left" | "right";
  value: number;
  max: number;
  onChange: (value: number) => void;
}) => {
  const t = useI18n();
  const enabled = value > 0;

  return (
    <Stack gap="sm">
      <Switch
        checked={enabled}
        disabled={max < 1}
        onChange={(event) => onChange(event.currentTarget.checked ? Math.min(2, max) : 0)}
        label={t(`layout.field.gutters.${side}.label`)}
        description={t(`layout.field.gutters.${side}.description`)}
      />
      {enabled && (
        <Input.Wrapper label={t("layout.field.gutters.width.label")}>
          <Slider
            mt="xs"
            min={1}
            max={max}
            value={Math.min(value, max)}
            marks={gutterMarks.filter((mark) => mark.value <= max)}
            restrictToMarks
            thumbLabel={t(`layout.field.gutters.${side}.thumbLabel`)}
            onChange={(nextValue) => onChange(Math.min(nextValue, max))}
          />
        </Input.Wrapper>
      )}
    </Stack>
  );
};

const GutterPreview = ({ left, right, columnCount }: { left: number; right: number; columnCount: number }) => {
  const t = useI18n();
  const safeColumnCount = Math.max(1, columnCount);
  const main = Math.max(1, safeColumnCount - left - right);
  const tracks = [left > 0 ? `${left}fr` : null, `${main}fr`, right > 0 ? `${right}fr` : null]
    .filter((track) => track !== null)
    .join(" ");

  return (
    <Box
      className={classes.gutterPreview}
      aria-label={t("layout.field.gutters.preview.label")}
      style={{ gridTemplateColumns: tracks }}
    >
      {left > 0 && <Box className={classes.previewGutter} data-side="left" />}
      <Box className={classes.previewCanvas}>
        <Box />
        <Box />
        <Box />
        <Box />
      </Box>
      {right > 0 && <Box className={classes.previewGutter} data-side="right" />}
    </Box>
  );
};
