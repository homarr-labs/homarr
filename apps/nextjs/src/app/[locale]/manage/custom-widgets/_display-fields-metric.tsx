import { ActionIcon, Box, Button, Group, Select, Stack, Switch, Text, TextInput, NumberInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { JsonPathTreePicker } from "@homarr/widgets/_inputs/json-path-tree-picker";
import { cloneLast, listItemDefaults, MANTINE_COLORS } from "./_display-field-shared";
import type { DisplayFieldsProps } from "./_display-field-types";

export function MetricDisplayFields({ form, t, previewJson }: DisplayFieldsProps) {
  const dt = form.values.displayType;

  if (dt === "statGrid") {
    return (
      <Stack gap="xs">
        <Group grow>
          <NumberInput label={t("field.gridColumns")} min={1} max={4} {...form.getInputProps("statGridColumns")} />
          <Select
            label={t("field.cardStyle")}
            data={["filled", "outline", "subtle"].map((v) => ({
              value: v,
              label: t(`cardStyleOption.${v}` as never),
            }))}
            {...form.getInputProps("cardStyle")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.statGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statGridItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`statGridItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 80 }}
              {...form.getInputProps(`statGridItems.${i}.unit`)}
            />
            <Select
              label={t("field.color")}
              data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
              style={{ width: 100 }}
              {...form.getInputProps(`statGridItems.${i}.color`)}
              allowDeselect={false}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("statGridItems", i)}
              disabled={form.values.statGridItems.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          type="button"
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("statGridItems", cloneLast(form.values.statGridItems, listItemDefaults.statGridItem))
          }
        >
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "progressBars") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Switch label={t("field.showPercentage")} {...form.getInputProps("showPercentage", { type: "checkbox" })} />
          <Select
            label={t("field.barSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("barSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.bars")}
        </Text>
        {form.values.progressBars.map((_bar, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`progressBars.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.valuePath")}
                placeholder={t("placeholder.valuePath")}
                {...form.getInputProps(`progressBars.${i}.valuePath`)}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.maxPath")}
                placeholder={t("placeholder.maxPath")}
                {...form.getInputProps(`progressBars.${i}.maxPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 60 }}
              {...form.getInputProps(`progressBars.${i}.unit`)}
            />
            <Select
              label={t("field.color")}
              data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
              style={{ width: 100 }}
              {...form.getInputProps(`progressBars.${i}.color`)}
              allowDeselect={false}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("progressBars", i)}
              disabled={form.values.progressBars.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          type="button"
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("progressBars", cloneLast(form.values.progressBars, listItemDefaults.progressBar))
          }
        >
          {t("action.addBar")}
        </Button>
      </Stack>
    );
  }

  return null;
}
