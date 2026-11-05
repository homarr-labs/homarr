"use client";

import {
  Anchor,
  Collapse,
  ColorSwatch,
  Fieldset,
  Group,
  isLightColor,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { UseFormReturnType } from "@homarr/form";
import { BoardAppearanceFields } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";
import { useSettings } from "@homarr/settings";

import { generateColorScale } from "~/theme/branding";
import type { FormValues } from "./_settings-form";

interface Props {
  form: UseFormReturnType<FormValues>;
}

const hexRegex = /^#[0-9a-fA-F]{6}$/;

export const ColorSettingsContent = ({ form }: Props) => {
  const [showPreview, { toggle }] = useDisclosure(false);
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const { branding } = useSettings();

  return (
    <Fieldset legend={tBoard("setting.section.appearance.title")} p="sm">
      <BoardAppearanceFields
        form={form}
        primaryColorLocked={branding.lockPrimaryColor}
        palettePreview={
          <>
            <Anchor onClick={toggle} size="sm" w="fit-content">
              {showPreview ? tCommon("preview.hide") : tCommon("preview.show")}
            </Anchor>
            <Collapse expanded={showPreview}>
              <Stack gap="xs">
                <ColorsPreview previewColor={form.values.primaryColor} />
                <ColorsPreview previewColor={form.values.secondaryColor} />
              </Stack>
            </Collapse>
          </>
        }
      />
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
