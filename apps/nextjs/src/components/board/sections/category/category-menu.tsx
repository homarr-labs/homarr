"use client";

import { useAtomValue } from "jotai";

import { ActionIcon, IconDotsVertical, IconEdit, Menu } from "@homarr/ui";

import { editModeAtom } from "../../editMode";

export const CategoryMenu = () => {
  const editMode = useAtomValue(editModeAtom);

  return (
    <Menu withArrow withinPortal>
      <Menu.Target>
        <ActionIcon>
          <IconDotsVertical />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconEdit size={16} />}>
          Edit category
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
