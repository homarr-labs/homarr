import { ActionIcon, Box, Button, Group, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { JsonPathTreePicker } from "@homarr/widgets/_inputs/json-path-tree-picker";
import { cloneLast, listItemDefaults, MANTINE_COLORS } from "./_display-field-shared";
import type { DisplayFieldsProps } from "./_display-field-types";

export function StatusDisplayFields({ form, t, previewJson }: DisplayFieldsProps) {
  const dt = form.values.displayType;

  if (dt === "statusIndicator") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select
            label={t("field.kvLayout")}
            data={["list", "grid"].map((v) => ({
              value: v,
              label: t(`layoutOption.${v}` as never),
            }))}
            {...form.getInputProps("statusLayout")}
            allowDeselect={false}
          />
          <Select
            label={t("field.dotSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("dotSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.statusItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statusItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`statusItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.goodValues")}
              placeholder={t("placeholder.goodValues")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statusItems.${i}.goodValues`)}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("statusItems", i)}
              disabled={form.values.statusItems.length <= 1}
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
            form.insertListItem("statusItems", cloneLast(form.values.statusItems, listItemDefaults.statusItem))
          }
        >
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "countGrid") {
    return (
      <Stack gap="xs">
        <Group grow>
          <NumberInput label={t("field.gridColumns")} min={2} max={4} {...form.getInputProps("countGridColumns")} />
          <Select
            label={t("field.valueSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("countValueSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.countGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`countGridItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`countGridItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 80 }}
              {...form.getInputProps(`countGridItems.${i}.unit`)}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("countGridItems", i)}
              disabled={form.values.countGridItems.length <= 1}
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
            form.insertListItem("countGridItems", cloneLast(form.values.countGridItems, listItemDefaults.countGridItem))
          }
        >
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "raw") {
    return (
      <>
        <JsonPathTreePicker
          json={previewJson}
          label={t("field.jsonPath")}
          description={t("field.jsonPathHint")}
          placeholder={t("placeholder.jsonPath")}
          {...form.getInputProps("rawJsonPath")}
        />
        <NumberInput
          label={t("field.maxHeight")}
          min={50}
          max={1000}
          step={50}
          {...form.getInputProps("rawMaxHeight")}
        />
      </>
    );
  }

  if (dt === "actionButton") {
    return (
      <Stack gap="sm">
        <TextInput label={t("field.buttonLabel")} required {...form.getInputProps("buttonLabel")} />
        <Select
          label={t("field.buttonColor")}
          data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
          {...form.getInputProps("buttonColor")}
          allowDeselect={false}
        />
        <TextInput
          label={t("field.confirmText")}
          description={t("field.confirmTextHint")}
          {...form.getInputProps("confirmText")}
        />
        <TextInput
          label={t("field.successMessage")}
          description={t("field.successMessageHint")}
          {...form.getInputProps("successMessage")}
        />
      </Stack>
    );
  }

  return null;
}
