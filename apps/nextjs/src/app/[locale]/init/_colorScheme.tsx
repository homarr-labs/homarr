"use client";

import type { ComboboxItem, ComboboxLikeRenderOptionInput } from "@mantine/core";
import { Group, Select, Text, useMantineColorScheme } from "@mantine/core";
import { IconCheck, IconMoon, IconSunFilled } from "@tabler/icons-react";

const colorSchemes = ["dark", "light"] as const;

export const ColorSchemeSelect = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const icon = icons[colorScheme as keyof typeof icons];

  return (
    <Select
      defaultValue="dark"
      value={colorScheme}
      variant="unstyled"
      unselectable="off"
      renderOption={RenderOption}
      onChange={(value) => {
        const scheme = colorSchemes.find((scheme) => value === scheme);
        if (!scheme) {
          return;
        }
        setColorScheme(scheme);
      }}
      leftSection={<icon.component size={16} stroke={1.5} color={icon.color} />}
      data={colorSchemes.map((value) => ({ value, label: `Use ${value} scheme` }))}
    />
  );
};

const icons = {
  dark: {
    component: IconMoon,
    color: "currentColor",
  },
  light: {
    component: IconSunFilled,
    color: "#fc0",
  },
};

const RenderOption = ({ option, checked }: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
  const icon = icons[option.value as keyof typeof icons];

  return (
    <Group wrap="nowrap" justify="space-between" w="100%">
      <Group wrap="nowrap">
        <icon.component size={16} stroke={1.5} color={icon.color} />
        <Text>Use {option.value} scheme</Text>
      </Group>
      {checked && <IconCheck color="currentColor" size={16} />}
    </Group>
  );
};
