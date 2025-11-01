import type { MantineColor } from "@mantine/core";
import { Box, Flex, Group, Progress, Text } from "@mantine/core";

import type { TablerIcon } from "@homarr/ui";

export const ProgressValue = ({ value }: { value: number }) => (
  <Group gap="xs" align="center" w="100%" wrap="nowrap">
    <Text size="xs">{value}%</Text>
    <Progress value={value} color={progressColor(value)} w="100%" />
  </Group>
);

const progressColor = (value: number): MantineColor => {
  if (value < 50) return "green";
  if (value < 75) return "yellow";
  return "red";
};

interface DotProps {
  color: MantineColor;
}

export const Dot = ({ color }: DotProps) => <Box style={{ borderRadius: "100%" }} bg={color} h={8} w={8}></Box>;

interface ItemProps {
  icon: TablerIcon;
  label: string;
  children: React.ReactNode;
}

export const Item = (props: ItemProps) => (
  <Group justify="space-between" align="center" wrap="nowrap" w="100%">
    <Group gap="xs" wrap="nowrap">
      <props.icon size={16} stroke={1.5} />
      <Text size="xs">{props.label}:</Text>
    </Group>

    <Flex c="white" justify="end" maw="50%" w="100%">
      {props.children}
    </Flex>
  </Group>
);
