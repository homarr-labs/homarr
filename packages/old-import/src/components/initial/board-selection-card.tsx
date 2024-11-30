import type { ChangeEvent } from "react";
import { Anchor, Card, Checkbox, Group, Stack, Text } from "@mantine/core";

import { objectEntries, objectKeys } from "@homarr/common";
import { boardSizes } from "@homarr/old-schema";

const trans = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

type BoardSize = (typeof boardSizes)[number];

export type BoardSizeRecord = Record<BoardSize, boolean | undefined>;
export type BoardSelectionMap = Map<string, BoardSizeRecord>;

interface BoardSelectionCardProps {
  selections: BoardSelectionMap;
  updateSelections: (callback: (selections: BoardSelectionMap) => BoardSelectionMap) => void;
}

const allChecked = (map: BoardSelectionMap) => {
  return [...map.values()].every((selection) => groupChecked(selection));
};

const groupChecked = (selection: BoardSizeRecord) =>
  objectEntries(selection).every(([_, value]) => value === true || value === undefined);

export const BoardSelectionCard = ({ selections, updateSelections }: BoardSelectionCardProps) => {
  const areAllChecked = allChecked(selections);

  const handleToggleAll = () => {
    updateSelections((selections) => {
      const updated = new Map(selections);

      [...selections.entries()].forEach(([name, selection]) => {
        objectKeys(selection).forEach((size) => {
          if (selection[size] === undefined) return;
          selection[size] = !areAllChecked;
        });

        updated.set(name, selection);
      });

      return updated;
    });
  };

  const registerToggleGroup = (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
    updateSelections((selections) => {
      const updated = new Map(selections);
      const selection = selections.get(name);

      if (!selection) return updated;

      objectKeys(selection).forEach((size) => {
        if (selection[size] === undefined) return;
        selection[size] = event.target.checked;
      });

      updated.set(name, selection);

      return updated;
    });
  };

  const registerToggle = (name: string, size: BoardSize) => (event: ChangeEvent<HTMLInputElement>) => {
    updateSelections((selections) => {
      const updated = new Map(selections);
      const selection = selections.get(name);

      if (!selection) return updated;

      selection[size] = event.target.checked;

      updated.set(name, selection);

      return updated;
    });
  };

  if (selections.size === 0) {
    return null;
  }

  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Group justify="space-between" align="center">
            <Text fw={500}>Found 10 boards</Text>
            <Anchor component="button" onClick={handleToggleAll}>
              {areAllChecked ? "Unselect all" : "Select all"}
            </Anchor>
          </Group>
          <Text size="sm" c="gray.6">
            Choose all boards with there size you want to import
          </Text>
        </Stack>

        <Stack gap="sm">
          {[...selections.entries()].map(([name, selection]) => (
            <Card withBorder>
              <Group justify="space-between" align="center" visibleFrom="md">
                <Checkbox
                  checked={groupChecked(selection)}
                  onChange={registerToggleGroup(name)}
                  label={
                    <Text fw={500} size="sm">
                      {name}
                    </Text>
                  }
                />
                <Group>
                  {boardSizes.map((size) => (
                    <Checkbox
                      key={size}
                      disabled={selection[size] === undefined}
                      checked={selection[size]}
                      onChange={registerToggle(name, size)}
                      label={trans[size]}
                    />
                  ))}
                </Group>
              </Group>
              <Stack hiddenFrom="md">
                <Checkbox
                  checked={groupChecked(selection)}
                  onChange={registerToggleGroup(name)}
                  label={
                    <Text fw={500} size="sm">
                      {name}
                    </Text>
                  }
                />
                <Stack gap="sm" ps="sm">
                  {objectEntries(selection)
                    .filter(([_, value]) => value !== undefined)
                    .map(([size, value]) => (
                      <Checkbox key={size} checked={value} onChange={registerToggle(name, size)} label={trans[size]} />
                    ))}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
};
