/* eslint-disable react/no-unknown-property */
// Ignored because of gridstack attributes

import type { RefObject } from "react";
import cx from "clsx";
import { useAtomValue } from "jotai";

import { useScopedI18n } from "@homarr/translation/client";
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
  useServerDataFor,
} from "@homarr/widgets";

import { useRequiredBoard } from "~/app/[locale]/boards/_context";
import type { Item } from "~/app/[locale]/boards/_types";
import { modalEvents } from "~/app/[locale]/modals";
import { editModeAtom } from "../editMode";
import { useItemActions } from "../items/item-actions";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";
import classes from "./item.module.css";

interface Props {
  items: Item[];
  refs: UseGridstackRefs;
}

export const SectionContent = ({ items, refs }: Props) => {
  const board = useRequiredBoard();

  return (
    <>
      {items.map((item) => {
        return (
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
            <Card
              className={cx(classes.itemCard, "grid-stack-item-content")}
              withBorder
              styles={{
                root: {
                  "--opacity": board.opacity / 100,
                },
              }}
            >
              <BoardItem item={item} />
            </Card>
          </div>
        );
      })}
    </>
  );
};

interface ItemProps {
  item: Item;
}

const BoardItem = ({ item }: ItemProps) => {
  const serverData = useServerDataFor(item.id);
  const Comp = loadWidgetDynamic(item.kind);
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const newItem = { ...item, options };

  if (!serverData?.isReady) return null;

  return (
    <>
      <ItemMenu offset={8} item={newItem} />
      <Comp
        options={options as never}
        integrations={item.integrations}
        serverData={serverData?.data as never}
      />
    </>
  );
};

const ItemMenu = ({ offset, item }: { offset: number; item: Item }) => {
  const t = useScopedI18n("item");
  const isEditMode = useAtomValue(editModeAtom);
  const { updateItemOptions, removeItem } = useItemActions();

  if (!isEditMode) return null;

  const openEditModal = () => {
    modalEvents.openManagedModal({
      title: t("edit.title"),
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
      title: t("remove.title"),
      children: t("remove.message"),
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
        <Menu.Label>{t("menu.label.settings")}</Menu.Label>
        <Menu.Item
          leftSection={<IconPencil size={16} />}
          onClick={openEditModal}
        >
          {t("action.edit")}
        </Menu.Item>
        <Menu.Item leftSection={<IconLayoutKanban size={16} />}>
          {t("action.move")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label c="red.6">{t("menu.label.dangerZone")}</Menu.Label>
        <Menu.Item
          c="red.6"
          leftSection={<IconTrash size={16} />}
          onClick={openRemoveModal}
        >
          {t("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
