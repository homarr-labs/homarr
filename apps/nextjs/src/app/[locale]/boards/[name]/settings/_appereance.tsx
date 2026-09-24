"use client";

import {
  ActionIcon,
  Anchor,
  Collapse,
  ColorInput,
  ColorSwatch,
  Fieldset,
  Group,
  InputWrapper,
  isLightColor,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput, CornerStylePicker, cornerStyleValues } from "@homarr/ui";
import { useSettings } from "@homarr/settings";

import { generateColorScale } from "~/theme/branding";
import type { FormValues } from "./_settings-form";

interface Props {
  form: UseFormReturnType<FormValues>;
}

const hexRegex = /^#[0-9a-fA-F]{6}$/;

const progressPercentageLabel = (value: number) => `${value}%`;

export const ColorSettingsContent = ({ form }: Props) => {
  const [showPreview, { toggle }] = useDisclosure(false);
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const theme = useMantineTheme();
  const { branding } = useSettings();

  return (
    <Fieldset legend={tBoard("setting.section.appearance.title")} p="sm">
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" verticalSpacing="sm">
        <Stack gap="xs">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
            <BoardColorInput
              label={tBoard("field.primaryColor.label")}
              description={branding.lockPrimaryColor ? tBoard("field.primaryColor.locked") : undefined}
              disabled={branding.lockPrimaryColor}
              {...form.getInputProps("primaryColor")}
            />
            <BoardColorInput label={tBoard("field.secondaryColor.label")} {...form.getInputProps("secondaryColor")} />
          </SimpleGrid>
          <Anchor onClick={toggle} size="sm" w="fit-content">
            {showPreview ? tCommon("preview.hide") : tCommon("preview.show")}
          </Anchor>
          <Collapse expanded={showPreview}>
            <Stack gap="xs">
              <ColorsPreview previewColor={form.values.primaryColor} />
              <ColorsPreview previewColor={form.values.secondaryColor} />
            </Stack>
          </Collapse>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
            <InputWrapper label={tBoard("field.opacity.label")}>
              <Slider
                my={6}
                min={0}
                max={100}
                step={5}
                label={progressPercentageLabel}
                {...form.getInputProps("opacity")}
              />
            </InputWrapper>
            <Group align="end" gap="xs" wrap="nowrap">
              <ColorInput
                label={tBoard("field.iconColor.label")}
                format="hex"
                swatches={Object.values(theme.colors).map((color) => color[6])}
                flex={1}
                style={{ minWidth: 0 }}
                {...form.getInputProps("iconColor")}
              />
              <ActionIcon
                type="button"
                variant="subtle"
                size={36}
                aria-label={tBoard("field.clearColor.label")}
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
          label={tBoard("field.itemRadius.label")}
          description={tBoard("field.itemRadius.description")}
          value={form.values.itemRadius}
          labels={
            Object.fromEntries(
              cornerStyleValues.map((cornerStyle) => [cornerStyle, tBoard(`field.itemRadius.option.${cornerStyle}`)]),
            ) as Record<(typeof cornerStyleValues)[number], string>
          }
          onChange={(itemRadius) => form.setFieldValue("itemRadius", itemRadius)}
        />
      </SimpleGrid>
    </Fieldset>
  );
};

interface ColorsPreviewProps {
  previewColor: string | undefined;
}

const ColorsPreview = ({ previewColor }: ColorsPreviewProps) => {
  const theme = useMantineTheme();

  const colors =
    previewColor && hexRegex.test(previewColor) ? generateColorScale(previewColor) : generateColorScale("#000000");

  return (
    <Group gap={0} wrap="nowrap">
      {colors.map((color, index) => (
        <ColorSwatch
          key={index}
          color={color}
          w="10%"
          pb="10%"
          c={isLightColor(color) ? "black" : "white"}
          radius={0}
          styles={{
            colorOverlay: {
              borderTopLeftRadius: index === 0 ? theme.radius.md : 0,
              borderBottomLeftRadius: index === 0 ? theme.radius.md : 0,
              borderTopRightRadius: index === 9 ? theme.radius.md : 0,
              borderBottomRightRadius: index === 9 ? theme.radius.md : 0,
            },
          }}
        >
          <Stack align="center" gap={4}>
            <Text visibleFrom="md" fw={500} size="lg">
              {index}
            </Text>
            <Text visibleFrom="md" fw={500} size="xs" tt="uppercase">
              {color}
            </Text>
          </Stack>
        </ColorSwatch>
      ))}
    </Group>
  );
};
