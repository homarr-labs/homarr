/* eslint-disable react/no-unknown-property */
// Ignored because of gridstack attributes

import type { RefObject } from "react";
import { useElementSize } from "@mantine/hooks";
import combineClasses from "clsx";
import { useAtomValue } from "jotai";

import { useConfirmModal, useModalAction } from "@homarr/modals";
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
  WidgetEditModal,
} from "@homarr/widgets";

import { useRequiredBoard } from "~/app/[locale]/boards/_context";
import type { Item } from "~/app/[locale]/boards/_types";
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
  const { ref, width, height } = useElementSize<HTMLDivElement>();

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
              ref={ref}
              className={combineClasses(
                classes.itemCard,
                "grid-stack-item-content",
              )}
              withBorder
              styles={{
                root: {
                  "--opacity": board.opacity / 100,
                },
              }}
              p={width >= 96 ? undefined : "xs"}
            >
              <BoardItem item={item} width={width + 32} height={height + 32} />
            </Card>
          </div>
        );
      })}
    </>
  );
};

interface ItemProps {
  item: Item;
  width: number;
  height: number;
}

const BoardItem = ({ item, ...dimensions }: ItemProps) => {
  const board = useRequiredBoard();
  const editMode = useAtomValue(editModeAtom);
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
        isEditMode={editMode}
        boardId={board.id}
        itemId={item.id}
        {...dimensions}
      />
    </>
  );
};

const ItemMenu = ({ offset, item }: { offset: number; item: Item }) => {
  const t = useScopedI18n("item");
  const { openModal } = useModalAction(WidgetEditModal);
  const { openConfirmModal } = useConfirmModal();
  const isEditMode = useAtomValue(editModeAtom);
  const { updateItemOptions, removeItem } = useItemActions();

  if (!isEditMode) return null;

  const openEditModal = () => {
    openModal({
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
    });
  };

  const openRemoveModal = () => {
    openConfirmModal({
      title: t("remove.title"),
      children: t("remove.message"),
      onConfirm: () => {
        removeItem({ itemId: item.id });
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
