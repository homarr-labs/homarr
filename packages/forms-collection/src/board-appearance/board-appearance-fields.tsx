"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Fieldset, Group, Input, SimpleGrid, Slider, Stack } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import type { CornerStyle } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput, CornerStylePicker } from "@homarr/ui";

interface BoardAppearanceValues {
  primaryColor: string;
  secondaryColor: string;
  iconColor: string | null;
  opacity: number;
  itemRadius: CornerStyle;
}

interface BoardAppearanceFieldsProps {
  form: Pick<UseFormReturnType<BoardAppearanceValues>, "values" | "getInputProps" | "setFieldValue">;
  primaryColorLocked?: boolean;
  palettePreview?: ReactNode;
  stacked?: boolean;
}

const percentageLabel = (value: number) => `${value}%`;

export const BoardAppearanceFields = ({
  form,
  primaryColorLocked = false,
  palettePreview,
  stacked = false,
}: BoardAppearanceFieldsProps) => {
  const t = useI18n("board.field");
  const opacityId = useId();
  const { error: opacityError, ...opacityInput } = form.getInputProps("opacity");
  let primaryColorDescription;
  if (primaryColorLocked) primaryColorDescription = t("primaryColor.locked");

  return (
    <SimpleGrid cols={stacked ? 1 : { base: 1, lg: 2 }} spacing="md" verticalSpacing="sm">
      <Stack gap="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
          <BoardColorInput
            label={t("primaryColor.label")}
            description={primaryColorDescription}
            disabled={primaryColorLocked}
            {...form.getInputProps("primaryColor")}
          />
          <BoardColorInput label={t("secondaryColor.label")} {...form.getInputProps("secondaryColor")} />
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
      <CornerStylePicker
        compact
        label={t("itemRadius.label")}
        description={t("itemRadius.description")}
        {...form.getInputProps("itemRadius")}
        value={form.values.itemRadius}
      />
    </SimpleGrid>
  );
};
