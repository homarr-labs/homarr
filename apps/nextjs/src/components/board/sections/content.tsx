/* eslint-disable react/no-unknown-property */
// Ignored because of gridstack attributes

import type { RefObject } from "react";
import { useAtomValue } from "jotai";

import {
  ActionIcon,
  Card,
  IconDotsVertical,
  IconLayoutKanban,
  IconPencil,
  IconTrash,
  Menu,
} from "@homarr/ui";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
} from "@homarr/widgets";

import type { Item } from "~/app/[locale]/boards/_types";
import { modalEvents } from "~/app/[locale]/modals";
import { editModeAtom } from "../editMode";
import { useItemActions } from "../items/item-actions";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";

interface Props {
  items: Item[];
  refs: UseGridstackRefs;
}

export const SectionContent = ({ items, refs }: Props) => {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid-stack-item"
          data-id={item.id}
          gs-x={item.xOffset}
          gs-y={item.yOffset}
          gs-w={item.width}
          gs-h={item.height}
          gs-min-w={1}
          gs-min-h={1}
          gs-max-w={4}
          gs-max-h={4}
          ref={refs.items.current[item.id] as RefObject<HTMLDivElement>}
        >
          <Card className="grid-stack-item-content" withBorder>
            <BoardItem item={item} />
          </Card>
        </div>
      ))}
    </>
  );
};

interface ItemProps {
  item: Item;
}

const BoardItem = ({ item }: ItemProps) => {
  const Comp = loadWidgetDynamic(item.kind);
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const newItem = { ...item, options };
  return (
    <>
      <ItemMenu offset={8} item={newItem} />
      <Comp options={options as never} integrations={item.integrations} />
    </>
  );
};

const ItemMenu = ({ offset, item }: { offset: number; item: Item }) => {
  const isEditMode = useAtomValue(editModeAtom);
  const { updateItemOptions, removeItem } = useItemActions();

  if (!isEditMode) return null;

  const openEditModal = () => {
    modalEvents.openManagedModal({
      title: "Edit item",
      modal: "widgetEditModal",
      innerProps: {
        kind: item.kind,
        value: {
          options: item.options,
          integrations: item.integrations.map(({ id }) => id),
        },
        onSuccessfulEdit: ({ options, integrations: _ }) => {
          updateItemOptions({
            itemId: item.id,
            newOptions: options,
          });
        },
        integrationData: [],
        integrationSupport: false,
      },
    });
  };

  const openRemoveModal = () => {
    modalEvents.openConfirmModal({
      title: "Remove item",
      children: "Are you sure you want to remove this item?",
      onConfirm: () => {
        removeItem({ itemId: item.id });
      },
      confirmProps: {
        color: "red",
      },
    });
  };

  return (
    <Menu withinPortal withArrow position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon
          variant="transparent"
          pos="absolute"
          top={offset}
          right={offset}
        >
          <IconDotsVertical />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label>Settings</Menu.Label>
        <Menu.Item
          leftSection={<IconPencil size={16} />}
          onClick={openEditModal}
        >
          Edit item
        </Menu.Item>
        <Menu.Item leftSection={<IconLayoutKanban size={16} />}>
          Move item
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label c="red.6">Danger zone</Menu.Label>
        <Menu.Item
          c="red.6"
          leftSection={<IconTrash size={16} />}
          onClick={openRemoveModal}
        >
          Remove item
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
