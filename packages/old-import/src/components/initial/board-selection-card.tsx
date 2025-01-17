import type { ChangeEvent } from "react";
import { Anchor, Card, Checkbox, Group, Stack, Text } from "@mantine/core";

import { objectEntries, objectKeys } from "@homarr/common";
import { boardSizes } from "@homarr/old-schema";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

type BoardSize = (typeof boardSizes)[number];

export type BoardSizeRecord = Record<BoardSize, boolean | null>;
export type BoardSelectionMap = Map<string, BoardSizeRecord>;

interface BoardSelectionCardProps {
  selections: BoardSelectionMap;
  updateSelections: (callback: (selections: BoardSelectionMap) => BoardSelectionMap) => void;
}

const allChecked = (map: BoardSelectionMap) => {
  return [...map.values()].every((selection) => groupChecked(selection));
};

const groupChecked = (selection: BoardSizeRecord) =>
  objectEntries(selection).every(([_, value]) => value === true || value === null);

export const BoardSelectionCard = ({ selections, updateSelections }: BoardSelectionCardProps) => {
  const tBoardSelection = useScopedI18n("init.step.import.boardSelection");
  const t = useI18n();
  const areAllChecked = allChecked(selections);

  const handleToggleAll = () => {
    updateSelections((selections) => {
      const updated = new Map(selections);

      [...selections.entries()].forEach(([name, selection]) => {
        objectKeys(selection).forEach((size) => {
          if (selection[size] === null) return;
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
        if (selection[size] === null) return;
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
            <Text fw={500}>{tBoardSelection("title", { count: selections.size })}</Text>
            <Anchor component="button" onClick={handleToggleAll}>
              {areAllChecked ? tBoardSelection("action.unselectAll") : tBoardSelection("action.selectAll")}
            </Anchor>
          </Group>
          <Text size="sm" c="gray.6">
            {tBoardSelection("description")}
          </Text>
          <Text size="xs" c="gray.6">
            {t("board.action.oldImport.form.screenSize.description")}
          </Text>
        </Stack>

        <Stack gap="sm">
          {[...selections.entries()].map(([name, selection]) => (
            <Card key={name} withBorder>
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
                      disabled={selection[size] === null}
                      checked={selection[size] ?? undefined}
                      onChange={registerToggle(name, size)}
                      label={t(`board.action.oldImport.form.screenSize.option.${size}`)}
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
                    .filter(([_, value]) => value !== null)
                    .map(([size, value]) => (
                      <Checkbox
                        key={size}
                        checked={value ?? undefined}
                        onChange={registerToggle(name, size)}
                        label={`screenSize.${size}`}
                      />
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
