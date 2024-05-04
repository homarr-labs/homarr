import { useCallback } from "react";
import type { ReactNode } from "react";
import type { SelectProps } from "@mantine/core";
import {
  Button,
  Flex,
  Group,
  Select,
  TableTd,
  TableTr,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconEye,
  IconPencil,
  IconSettings,
} from "@tabler/icons-react";

import type { BoardPermission } from "@homarr/definitions";
import { boardPermissions } from "@homarr/definitions";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { OnCountChange } from "./form";
import { useFormContext } from "./form";

const icons = {
  "board-change": IconPencil,
  "board-view": IconEye,
  "board-full": IconSettings,
} satisfies Record<BoardPermission | "board-full", TablerIcon>;

interface BoardAccessSelectRowProps {
  itemContent: ReactNode;
  permission: BoardPermission;
  index: number;
  onCountChange: OnCountChange;
}

export const BoardAccessSelectRow = ({
  itemContent,
  permission,
  index,
  onCountChange,
}: BoardAccessSelectRowProps) => {
  const tRoot = useI18n();
  const tPermissions = useScopedI18n("board.setting.section.access.permission");
  const form = useFormContext();
  const Icon = icons[permission];

  const handleRemove = useCallback(() => {
    form.setFieldValue(
      "items",
      form.values.items.filter((_, i) => i !== index),
    );
    onCountChange((prev) => prev - 1);
  }, [form, index, onCountChange]);

  return (
    <TableTr>
      <TableTd w={{ sm: 128, lg: 256 }}>{itemContent}</TableTd>
      <TableTd>
        <Flex
          direction={{ base: "column", xs: "row" }}
          align={{ base: "end", xs: "center" }}
          wrap="nowrap"
        >
          <Select
            allowDeselect={false}
            flex="1"
            leftSection={<Icon size="1rem" />}
            renderOption={RenderOption}
            variant="unstyled"
            data={boardPermissions.map((permission) => ({
              value: permission,
              label: tPermissions(`item.${permission}.label`),
            }))}
            {...form.getInputProps(`items.${index}.permission`)}
          />

          <Button size="xs" variant="subtle" onClick={handleRemove}>
            {tRoot("common.action.remove")}
          </Button>
        </Flex>
      </TableTd>
    </TableTr>
  );
};

interface BoardAccessDisplayRowProps {
  itemContent: ReactNode;
  permission: BoardPermission | "board-full";
}

export const BoardAccessDisplayRow = ({
  itemContent,
  permission,
}: BoardAccessDisplayRowProps) => {
  const tPermissions = useScopedI18n("board.setting.section.access.permission");
  const Icon = icons[permission];

  return (
    <TableTr>
      <TableTd w={{ sm: 128, lg: 256 }}>{itemContent}</TableTd>
      <TableTd>
        <Group gap={0}>
          <Flex w={34} h={34} align="center" justify="center">
            <Icon
              size="1rem"
              color="var(--input-section-color, var(--mantine-color-dimmed))"
            />
          </Flex>
          <Text size="sm">{tPermissions(`item.${permission}.label`)}</Text>
        </Group>
      </TableTd>
    </TableTr>
  );
};

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: "1rem",
};

const RenderOption: SelectProps["renderOption"] = ({ option, checked }) => {
  const Icon = icons[option.value as BoardPermission];
  return (
    <Group flex="1" gap="xs" wrap="nowrap">
      <Icon {...iconProps} />
      {option.label}
      {checked && (
        <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />
      )}
    </Group>
  );
};
