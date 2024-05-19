/* eslint-disable react/no-unknown-property */
// Ignored because of gridstack attributes

import { useMemo } from "react";
import type { RefObject } from "react";
import { ActionIcon, Card, Menu } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconDotsVertical, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";
import combineClasses from "clsx";
import { useAtomValue } from "jotai";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  useServerDataFor,
  WidgetEditModal,
  widgetImports,
} from "@homarr/widgets";

import type { Item } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
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
      {items.map((item) => (
        <BoardItem key={item.id} refs={refs} item={item} opacity={board.opacity} />
      ))}
    </>
  );
};

interface ItemProps {
  item: Item;
  refs: UseGridstackRefs;
  opacity: number;
}

const BoardItem = ({ refs, item, opacity }: ItemProps) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();

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
        className={combineClasses(classes.itemCard, "grid-stack-item-content")}
        withBorder
        styles={{
          root: {
            "--opacity": opacity / 100,
          },
        }}
        p={0}
      >
        <BoardItemContent item={item} width={width} height={height} />
      </Card>
    </div>
  );
};

interface ItemContentProps {
  item: Item;
  width: number;
  height: number;
}

const BoardItemContent = ({ item, ...dimensions }: ItemContentProps) => {
  const board = useRequiredBoard();
  const editMode = useAtomValue(editModeAtom);
  const serverData = useServerDataFor(item.id);
  const Comp = loadWidgetDynamic(item.kind);
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const newItem = { ...item, options };

  if (!serverData?.isReady) return null;

  return (
    <>
      <ItemMenu offset={4} item={newItem} />
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
  const tItem = useScopedI18n("item");
  const t = useI18n();
  const { openModal } = useModalAction(WidgetEditModal);
  const { openConfirmModal } = useConfirmModal();
  const isEditMode = useAtomValue(editModeAtom);
  const { updateItemOptions, updateItemIntegrations, removeItem } = useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery();
  const currentDefinition = useMemo(() => widgetImports[item.kind].definition, [item.kind]);

  if (!isEditMode || isPending) return null;

  const openEditModal = () => {
    openModal({
      kind: item.kind,
      value: {
        options: item.options,
        integrations: item.integrations,
      },
      onSuccessfulEdit: ({ options, integrations }) => {
        updateItemOptions({
          itemId: item.id,
          newOptions: options,
        });
        updateItemIntegrations({
          itemId: item.id,
          newIntegrations: integrations,
        });
      },
      integrationData: (integrationData ?? []).filter(
        (integration) =>
          "supportedIntegrations" in currentDefinition &&
          (currentDefinition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
      ),
      integrationSupport: "supportedIntegrations" in currentDefinition,
    });
  };

  const openRemoveModal = () => {
    openConfirmModal({
      title: tItem("remove.title"),
      children: tItem("remove.message"),
      onConfirm: () => {
        removeItem({ itemId: item.id });
      },
    });
  };

  return (
    <Menu withinPortal withArrow position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon variant="transparent" pos="absolute" top={offset} right={offset} style={{ zIndex: 1 }}>
          <IconDotsVertical />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label>{tItem("menu.label.settings")}</Menu.Label>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>
          {tItem("action.edit")}
        </Menu.Item>
        <Menu.Item leftSection={<IconLayoutKanban size={16} />}>{tItem("action.move")}</Menu.Item>
        <Menu.Divider />
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>
          {tItem("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
