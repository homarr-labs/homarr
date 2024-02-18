"use client";

import { generateColorsMap } from "@mantine/colors-generator";
import { useDisclosure } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
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
  isLightColor,
  Stack,
  Text,
  useMantineTheme,
} from "@homarr/ui";

import type { Board } from "../../_types";

interface Props {
  board: Board;
}

export const ColorSettingsContent = ({ board }: Props) => {
  const form = useForm({
    initialValues: {
      primaryColor: board.primaryColor,
      secondaryColor: board.secondaryColor,
      primaryShade: board.primaryShade,
    },
  });
  const [showPreview, { toggle }] = useDisclosure(false);
  const t = useI18n();
  const theme = useMantineTheme();
  const { mutate: savePartialSettings, isPending } =
    clientApi.board.savePartialSettings.useMutation();

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        savePartialSettings({
          boardId: board.id,
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
              <Anchor onClick={toggle}>Show preview</Anchor>
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
  const { colors, baseColorIndex } = generateColorsMap(previewColor);
  const theme = useMantineTheme();

  return (
    <Group gap={0}>
      {colors.map((color, index) => (
        <ColorSwatch
          key={color.hex()}
          color={color.hex()}
          w={index === baseColorIndex ? "12.25%" : "9.75%"}
          pb={index === baseColorIndex ? "12.25%" : "9.75%"}
          c={isLightColor(color.hex()) ? "black" : "white"}
          radius={0}
          styles={{
            colorOverlay: {
              borderTopLeftRadius:
                index === 0 || index === baseColorIndex ? theme.radius.md : 0,
              borderBottomLeftRadius:
                index === 0 || index === baseColorIndex ? theme.radius.md : 0,
              borderTopRightRadius:
                index === 9 || index === baseColorIndex ? theme.radius.md : 0,
              borderBottomRightRadius:
                index === 9 || index === baseColorIndex ? theme.radius.md : 0,
            },
          }}
        >
          <Stack align="center" gap={4}>
            <Text visibleFrom="md" fw={500} size="lg">
              {index}
            </Text>
            <Text visibleFrom="md" fw={500} size="xs" tt="uppercase">
              {color.hex()}
            </Text>
          </Stack>
        </ColorSwatch>
      ))}
    </Group>
  );
};
