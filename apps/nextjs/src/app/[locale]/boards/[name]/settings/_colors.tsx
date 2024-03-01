"use client";

import { useDisclosure } from "@mantine/hooks";

import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
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
  Slider,
  Stack,
  Text,
  useMantineTheme,
} from "@homarr/ui";

import { generateColors } from "../../_theme";
import type { Board } from "../../_types";
import { useSavePartialSettingsMutation } from "./_shared";

interface Props {
  board: Board;
}

const hexRegex = /^#[0-9a-fA-F]{6}$/;

export const ColorSettingsContent = ({ board }: Props) => {
  const form = useForm({
    initialValues: {
      primaryColor: board.primaryColor,
      secondaryColor: board.secondaryColor,
      primaryShade: board.primaryShade,
      opacity: board.opacity,
    },
  });
  const [showPreview, { toggle }] = useDisclosure(false);
  const t = useI18n();
  const theme = useMantineTheme();
  const { mutate: savePartialSettings, isPending } =
    useSavePartialSettingsMutation(board);
  return (
    <form
      onSubmit={form.onSubmit((values) => {
        savePartialSettings({
          id: board.id,
          ...values,
        });
      })}
    >
      <Stack>
        <Grid>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <Stack gap="xs">
              <ColorInput
                label={t("board.field.primaryColor.label")}
                format="hex"
                swatches={Object.values(theme.colors).map((color) => color[6])}
                {...form.getInputProps("primaryColor")}
              />
              <Anchor onClick={toggle}>
                {showPreview
                  ? t("common.preview.hide")
                  : t("common.preview.show")}
              </Anchor>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <ColorInput
              label={t("board.field.secondaryColor.label")}
              format="hex"
              swatches={Object.values(theme.colors).map((color) => color[6])}
              {...form.getInputProps("secondaryColor")}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Collapse in={showPreview}>
              <Stack>
                <ColorsPreview previewColor={form.values.primaryColor} />
                <ColorsPreview previewColor={form.values.secondaryColor} />
              </Stack>
            </Collapse>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <InputWrapper label={t("board.field.opacity.label")}>
              <Slider
                my={6}
                min={0}
                max={100}
                step={5}
                label={(value) => `${value}%`}
                {...form.getInputProps("opacity")}
              />
            </InputWrapper>
          </Grid.Col>
        </Grid>
        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface ColorsPreviewProps {
  previewColor: string;
}

const ColorsPreview = ({ previewColor }: ColorsPreviewProps) => {
  const theme = useMantineTheme();

  const colors = hexRegex.test(previewColor)
    ? generateColors(previewColor)
    : generateColors("#000000");

  return (
    <Group gap={0}>
      {colors.map((color, index) => (
        <ColorSwatch
          key={index}
          color={color}
          w={index === 5 ? "12.25%" : "9.75%"}
          pb={index === 5 ? "12.25%" : "9.75%"}
          c={isLightColor(color) ? "black" : "white"}
          radius={0}
          styles={{
            colorOverlay: {
              borderTopLeftRadius:
                index === 0 || index === 5 ? theme.radius.md : 0,
              borderBottomLeftRadius:
                index === 0 || index === 5 ? theme.radius.md : 0,
              borderTopRightRadius:
                index === 9 || index === 5 ? theme.radius.md : 0,
              borderBottomRightRadius:
                index === 9 || index === 5 ? theme.radius.md : 0,
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
