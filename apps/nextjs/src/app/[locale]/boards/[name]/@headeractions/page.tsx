"use client";

import { useAtom } from "jotai";

import {
  Group,
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconPackageImport,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconSettings,
  Menu,
} from "@homarr/ui";

import { editModeAtom } from "~/components/board/editMode";
import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "../../_context";

export default function BoardViewHeaderActions() {
  const [editMode, setEditMode] = useAtom(editModeAtom);
  const board = useRequiredBoard();

  return (
    <>
      <Menu position="bottom-end" withArrow>
        <Menu.Target>
          <HeaderButton onClick={() => []} w="auto" px={4}>
            <Group gap={4} wrap="nowrap">
              <IconPlus stroke={1.5} />
              <IconChevronDown color="gray" size={16} />
            </Group>
          </HeaderButton>
        </Menu.Target>
        <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
          <Menu.Item leftSection={<IconBox size={20} />}>New Item</Menu.Item>
          <Menu.Item leftSection={<IconPackageImport size={20} />}>
            Import Item
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconBoxAlignTop size={20} />}>
            New Category
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <HeaderButton
        onClick={() => {
          setEditMode((em) => !em);
        }}
      >
        {editMode ? (
          <IconPencilOff stroke={1.5} />
        ) : (
          <IconPencil stroke={1.5} />
        )}
      </HeaderButton>

      <HeaderButton href={`/boards/${board.name}/settings`}>
        <IconSettings stroke={1.5} />
      </HeaderButton>
    </>
  );
}
