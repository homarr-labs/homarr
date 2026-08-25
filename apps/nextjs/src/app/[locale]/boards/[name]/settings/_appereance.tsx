"use client";

import {
  Anchor,
  Button,
  Collapse,
  ColorInput,
  ColorSwatch,
  Grid,
  Group,
  InputWrapper,
  isLightColor,
  Select,
  Slider,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput } from "@homarr/ui";
import { useSettings } from "@homarr/settings";

import { SectionCard } from "~/components/manage/section-card";
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
    <SectionCard title={tBoard("setting.section.appearance.title")}>
      <Grid>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <Stack gap="xs">
            <BoardColorInput
              label={tBoard("field.primaryColor.label")}
              description={branding.lockPrimaryColor ? tBoard("field.primaryColor.locked") : undefined}
              disabled={branding.lockPrimaryColor}
              {...form.getInputProps("primaryColor")}
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <BoardColorInput label={tBoard("field.secondaryColor.label")} {...form.getInputProps("secondaryColor")} />
        </Grid.Col>
        <Grid.Col span={12}>
          <Anchor onClick={toggle}>{showPreview ? tCommon("preview.hide") : tCommon("preview.show")}</Anchor>
        </Grid.Col>
        <Grid.Col span={12}>
          <Collapse expanded={showPreview}>
            <Stack>
              <ColorsPreview previewColor={form.values.primaryColor} />
              <ColorsPreview previewColor={form.values.secondaryColor} />
            </Stack>
          </Collapse>
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
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
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <Group align="end">
            <ColorInput
              label={tBoard("field.iconColor.label")}
              format="hex"
              swatches={Object.values(theme.colors).map((color) => color[6])}
              flex={1}
              {...form.getInputProps("iconColor")}
            />
            <Button
              type="button"
              variant="subtle"
              leftSection={<IconX />}
              onClick={() => form.setFieldValue("iconColor", "")}
              disabled={!form.values.iconColor}
            >
              {tBoard("field.clearColor.label")}
            </Button>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <Select
            label={tBoard("field.itemRadius.label")}
            description={tBoard("field.itemRadius.description")}
            data={[
              { label: tBoard("field.itemRadius.option.xs"), value: "xs" },
              { label: tBoard("field.itemRadius.option.sm"), value: "sm" },
              { label: tBoard("field.itemRadius.option.md"), value: "md" },
              { label: tBoard("field.itemRadius.option.lg"), value: "lg" },
              { label: tBoard("field.itemRadius.option.xl"), value: "xl" },
            ]}
            {...form.getInputProps("itemRadius")}
          />
        </Grid.Col>
      </Grid>
    </SectionCard>
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
