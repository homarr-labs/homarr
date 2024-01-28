/* eslint-disable react/no-unknown-property */ // Ignored because of gridstack attributes

import type { RefObject } from "react";

import { ActionIcon, Card, IconDotsVertical, IconLayoutKanban, IconPencil, IconTrash, Menu } from "@homarr/ui";
import { loadWidgetDynamic } from "@homarr/widgets";

import { Item } from "~/app/[locale]/boards/_types";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";
import { modalEvents } from "~/app/[locale]/modals";
import { useItemActions } from "../items/item-actions";

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
            <Item item={item} />
          </Card>
        </div>
      ))}
    </>
  );
};

const Item = ({
  item
}: {
  item: Item;
}) => {
  const Comp = loadWidgetDynamic(item.kind);
  return <>
    <ItemMenu offset={8} item={item} />
    <Comp options={item.options} integrations={item.integrations} />
  </>; // TODO: reduceWidgetOptionsWithDefaultValues
};

const ItemMenu = ({ offset, item }: { offset: number, item: Item }) => {
  const { updateItemOptions, removeItem } = useItemActions();
  const openEditModal = () => {
    modalEvents.openManagedModal({
      modal: 'widgetEditModal',
      innerProps: {
        kind: item.kind,
        value: item.options,
        onSuccessfulEdit: (newOptions) => {
          updateItemOptions({
            itemId: item.id,
            newOptions
          })
        }
      }
    })
  }

  const openRemoveModal = () => {
    modalEvents.openConfirmModal({
      title: 'Remove item',
      children: 'Are you sure you want to remove this item?',
      onConfirm: () => {
        removeItem({ itemId: item.id });
      },
      confirmProps: {
        color: "red"
      }
    });
  }

  return <Menu withinPortal withArrow position="right-start" arrowPosition="center">
    <Menu.Target>
      <ActionIcon variant="transparent" pos="absolute" top={offset} right={offset}>
        <IconDotsVertical />
      </ActionIcon>
    </Menu.Target>
    <Menu.Dropdown miw={128}>
      <Menu.Label>Settings</Menu.Label>
      <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>Edit item</Menu.Item>
      <Menu.Item leftSection={<IconLayoutKanban size={16} />}>Move item</Menu.Item>
      <Menu.Divider />
      <Menu.Label c="red.6">Danger zone</Menu.Label>
      <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>Remove item</Menu.Item>
    </Menu.Dropdown>
  </Menu>
}