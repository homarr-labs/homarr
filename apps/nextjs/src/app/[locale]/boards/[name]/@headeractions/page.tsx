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

import { modalEvents } from "~/app/[locale]/modals";
import { editModeAtom } from "~/components/board/editMode";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "../../_context";

export default function BoardViewHeaderActions() {
  const [editMode, setEditMode] = useAtom(editModeAtom);
  const board = useRequiredBoard();

  return (
    <>
      {editMode && <AddMenu />}
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

const AddMenu = () => {
  const { addCategoryToEnd } = useCategoryActions();

  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item
          leftSection={<IconBox size={20} />}
          onClick={() =>
            modalEvents.openManagedModal({
              title: "Choose item to add",
              size: "xl",
              modal: "itemSelectModal",
              innerProps: {},
            })
          }
        >
          New Item
        </Menu.Item>
        <Menu.Item leftSection={<IconPackageImport size={20} />}>
          Import Item
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconBoxAlignTop size={20} />}
          onClick={() =>
            modalEvents.openManagedModal({
              title: "New Category",
              modal: "categoryEditModal",
              innerProps: {
                submitLabel: "Add category",
                category: {
                  id: "new",
                  name: "",
                },
                onSuccess({ name }) {
                  addCategoryToEnd({ name });
                },
              },
            })
          }
        >
          New Category
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
