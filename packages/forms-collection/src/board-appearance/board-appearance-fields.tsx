"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Fieldset, Group, Input, SimpleGrid, Slider, Stack, Select, Box } from "@mantine/core";
import { IconArrowBackUp, IconX } from "@tabler/icons-react";

import { cornerStyleValues } from "@homarr/definitions";
import type { CornerStyle } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput } from "@homarr/ui";

interface BoardAppearanceValues {
  primaryColor: string | null;
  secondaryColor: string | null;
  iconColor: string | null;
  opacity: number;
  itemRadius: CornerStyle | null;
}

interface BoardAppearanceFieldsProps {
  form: Pick<UseFormReturnType<BoardAppearanceValues>, "values" | "getInputProps" | "setFieldValue">;
  palettePreview?: ReactNode;
  stacked?: boolean;
}

const percentageLabel = (value: number) => `${value}%`;

export const BoardAppearanceFields = ({ form, palettePreview, stacked = false }: BoardAppearanceFieldsProps) => {
  const t = useI18n("board.field");
  const opacityId = useId();
  const { error: opacityError, ...opacityInput } = form.getInputProps("opacity");
  const tCommon = useI18n("common");
  const renderColorInput = (field: "primaryColor" | "secondaryColor") => (
    <BoardColorInput
      label={t(`${field}.label`)}
      {...form.getInputProps(field)}
      value={form.values[field] ?? ""}
      placeholder={tCommon("customTheme.instanceDefault")}
      onChange={(value) => form.setFieldValue(field, value || null)}
      inputContainer={(input) => (
        <Group gap="xs" wrap="nowrap">
          <Box flex={1} miw={0}>
            {input}
          </Box>
          <ActionIcon
            variant="subtle"
            size="input-sm"
            disabled={form.values[field] === null}
            aria-label={tCommon("customTheme.useInstanceDefault", { control: t(`${field}.label`) })}
            title={tCommon("customTheme.instanceDefault")}
            onClick={() => form.setFieldValue(field, null)}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Group>
      )}
    />
  );

  return (
    <SimpleGrid cols={stacked ? 1 : { base: 1, lg: 2 }} spacing="md" verticalSpacing="sm">
      <Stack gap="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
          {renderColorInput("primaryColor")}
          {renderColorInput("secondaryColor")}
        </SimpleGrid>
        {palettePreview}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
          <Fieldset
            id={opacityId}
            legend={t("opacity.label")}
            variant="unstyled"
            m={0}
            miw={0}
            styles={{ legend: { marginBottom: 0, fontWeight: 500 } }}
            aria-describedby={opacityError ? `${opacityId}-error` : undefined}
          >
            <Slider
              my={6}
              min={0}
              max={100}
              step={5}
              label={percentageLabel}
              thumbLabel={t("opacity.label")}
              thumbValueText={percentageLabel}
              {...opacityInput}
            />
            {opacityError && <Input.Error id={`${opacityId}-error`}>{opacityError}</Input.Error>}
          </Fieldset>
          <Group align="end" gap="xs" wrap="nowrap">
            <BoardColorInput
              label={t("iconColor.label")}
              flex={1}
              style={{ minWidth: 0 }}
              {...form.getInputProps("iconColor")}
            />
            <ActionIcon
              type="button"
              variant="subtle"
              size={36}
              aria-label={t("clearColor.label")}
              onClick={() => form.setFieldValue("iconColor", "")}
              disabled={!form.values.iconColor}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </SimpleGrid>
      </Stack>
      <Select
        label={t("itemRadius.label")}
        {...form.getInputProps("itemRadius")}
        value={form.values.itemRadius ?? "instance"}
        allowDeselect={false}
        data={[
          { value: "instance", label: tCommon("customTheme.instanceDefault") },
          ...cornerStyleValues.map((value) => ({ value, label: tCommon(`cornerStyle.options.${value}`) })),
        ]}
        onChange={(value) => {
          if (value === "instance") form.setFieldValue("itemRadius", null);
          else if (cornerStyleValues.includes(value as CornerStyle))
            form.setFieldValue("itemRadius", value as CornerStyle);
        }}
      />
    </SimpleGrid>
  );
};
