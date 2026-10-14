import { Group, Select, Text } from "@mantine/core";
import type { SelectProps } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";

import type { HeaderComposerBoard } from "./header-composer";

export interface BoardSelectProps extends Omit<SelectProps, "data" | "renderOption"> {
  readonly boards: readonly HeaderComposerBoard[];
}

export const BoardSelect = ({ boards, ...props }: BoardSelectProps) => (
  <Select
    {...props}
    comboboxProps={{ withinPortal: true, ...props.comboboxProps }}
    data={boards.map((board) => ({ value: board.id, label: board.name }))}
    renderOption={({ option }) => {
      const image = boards.find((board) => board.id === option.value)?.logoImageUrl;
      return (
        <Group>
          {image ? <img width={16} height={16} src={image} alt={option.label} /> : <IconLayoutDashboard size={16} />}
          <Text fz="sm" fw={500}>
            {option.label}
          </Text>
        </Group>
      );
    }}
  />
);
