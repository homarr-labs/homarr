import { ActionIcon, Box, Button, Group, NumberInput, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { JsonPathTreePicker } from "@homarr/widgets/_inputs/json-path-tree-picker";
import { cloneLast, listItemDefaults } from "./_display-field-shared";
import type { DisplayFieldsProps } from "./_display-field-types";

export function BasicDisplayFields({ form, t, previewJson }: DisplayFieldsProps) {
  const dt = form.values.displayType;

  if (dt === "singleValue") {
    return (
      <>
        <JsonPathTreePicker
          json={previewJson}
          label={t("field.jsonPath")}
          description={t("field.jsonPathHint")}
          required
          placeholder={t("placeholder.jsonPath")}
          {...form.getInputProps("jsonPath")}
        />
        <TextInput
          label={t("field.label")}
          placeholder={t("placeholder.exampleLabel")}
          {...form.getInputProps("label")}
        />
        <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} {...form.getInputProps("unit")} />
        <Group grow>
          <Select
            label={t("field.valueSize")}
            data={["sm", "md", "lg", "xl"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("valueSize")}
            allowDeselect={false}
          />
          <Select
            label={t("field.labelPosition")}
            data={["above", "below"].map((v) => ({
              value: v,
              label: t(`labelPositionOption.${v}` as never),
            }))}
            {...form.getInputProps("labelPosition")}
            allowDeselect={false}
          />
        </Group>
      </>
    );
  }

  if (dt === "keyValue") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select
            label={t("field.kvLayout")}
            data={["list", "grid"].map((v) => ({
              value: v,
              label: t(`layoutOption.${v}` as never),
            }))}
            {...form.getInputProps("kvLayout")}
            allowDeselect={false}
          />
          {form.values.kvLayout === "grid" && (
            <NumberInput label={t("field.gridColumns")} min={1} max={3} {...form.getInputProps("kvColumns")} />
          )}
        </Group>
        <Text size="sm" fw={500}>
          {t("field.mappings")}
        </Text>
        {form.values.mappings.map((_m, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`mappings.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`mappings.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 80 }}
              {...form.getInputProps(`mappings.${i}.unit`)}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("mappings", i)}
              disabled={form.values.mappings.length <= 1}
              aria-label={t("action.removeMapping")}
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
          onClick={() => form.insertListItem("mappings", cloneLast(form.values.mappings, listItemDefaults.mapping))}
        >
          {t("action.addMapping")}
        </Button>
      </Stack>
    );
  }

  if (dt === "table") {
    return (
      <Stack gap="xs">
        <JsonPathTreePicker
          json={previewJson}
          label={t("field.tablePath")}
          description={t("field.tablePathHint")}
          required
          placeholder={t("placeholder.tablePath")}
          {...form.getInputProps("tablePath")}
        />
        <Group grow>
          <Switch label={t("field.striped")} {...form.getInputProps("striped", { type: "checkbox" })} />
          <Switch label={t("field.compact")} {...form.getInputProps("compact", { type: "checkbox" })} />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.columns")}
        </Text>
        {form.values.columns.map((_col, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.header")}
              placeholder={t("placeholder.exampleHeader")}
              style={{ flex: 1 }}
              {...form.getInputProps(`columns.${i}.header`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.columnJsonPath")}
                {...form.getInputProps(`columns.${i}.jsonPath`)}
              />
            </Box>
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("columns", i)}
              disabled={form.values.columns.length <= 1}
              aria-label={t("action.removeColumn")}
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
          onClick={() => form.insertListItem("columns", cloneLast(form.values.columns, listItemDefaults.column))}
        >
          {t("action.addColumn")}
        </Button>
      </Stack>
    );
  }

  return null;
}
