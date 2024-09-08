import React, { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ActionIcon, ActionIconProps, Card, Fieldset, Stack } from "@mantine/core";
import { IconGripHorizontal } from "@tabler/icons-react";

import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

export const WidgetSortedItemListInput = <TItem extends { id: string }>({
  property,
  options,
}: CommonWidgetInputProps<"sortableItemList">) => {
  const form = useFormContext();

  const values = form.values.options[property] as UniqueIdentifier[];
  const dataMap = options.useData?.() ?? new Map<UniqueIdentifier, TItem>();
  const tempMap = new Map<UniqueIdentifier, TItem>();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const isFirstAnnouncement = useRef(true);
  const getIndex = (id: UniqueIdentifier) => values.indexOf(id);
  const activeIndex = activeId ? getIndex(activeId) : -1;

  useEffect(() => {
    if (!activeId) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  const getItem = (id: UniqueIdentifier) => {
    if (!tempMap.has(id)) {
      return dataMap.get(id);
    }

    return tempMap.get(id);
  };

  const updateItems = (callback: (prev: UniqueIdentifier[]) => UniqueIdentifier[]) => {
    form.setFieldValue(`options.${property}`, callback);
  };

  const addItem = (item: TItem) => {
    tempMap.set(item.id, item);
    form.setFieldValue(`options.${property}`, [...values, item.id]);
  };

  return (
    <Fieldset legend="Items">
      <Stack>
        <options.addButton addItem={addItem} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!active) {
              return;
            }

            setActiveId(active.id);
          }}
          onDragEnd={({ over }) => {
            setActiveId(null);

            if (over) {
              const overIndex = getIndex(over.id);
              if (activeIndex !== overIndex) {
                updateItems((items) => arrayMove(items, activeIndex, overIndex));
              }
            }
          }}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={values} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {values.map((value, index) => {
                const item = getItem(value);
                const removeItem = () => {
                  form.setFieldValue(
                    `options.${property}`,
                    values.filter((id) => id !== value),
                  );
                };

                if (!item) {
                  return null;
                }

                return (
                  <Item key={value} id={value} index={index} item={item} removeItem={removeItem} options={options} />
                );
              })}
            </Stack>
          </SortableContext>
        </DndContext>
      </Stack>
    </Fieldset>
  );
};

interface ItemProps<TItem extends { id: string }> {
  id: UniqueIdentifier;
  item: TItem;
  index: number;
  removeItem: () => void;
  options: CommonWidgetInputProps<"sortableItemList">["options"];
}

const Item = <TItem extends { id: string }>({ id, index, item, removeItem, options }: ItemProps<TItem>) => {
  const {
    active,
    attributes,
    isDragging,
    isSorting,
    listeners,
    overIndex,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
  });

  const Handle = (props: Partial<ActionIconProps>) => {
    return (
      <ActionIcon
        variant="transparent"
        color="gray"
        {...props}
        {...listeners}
        ref={setActivatorNodeRef}
        style={{ cursor: "grab" }}
      >
        <IconGripHorizontal />
      </ActionIcon>
    );
  };

  return (
    <Card
      withBorder
      shadow="xs"
      padding="sm"
      radius="md"
      style={
        {
          transition: [transition].filter(Boolean).join(", "),
          "--translate-x": transform ? `${Math.round(transform.x)}px` : undefined,
          "--translate-y": transform ? `${Math.round(transform.y)}px` : undefined,
          "--scale-x": transform?.scaleX ? `${transform.scaleX}` : undefined,
          "--scale-y": transform?.scaleY ? `${transform.scaleY}` : undefined,
          "--index": index,
          transform:
            "translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))",
          transformOrigin: "0 0",
          ...(isDragging
            ? {
                opacity: "var(--dragging-opacity, 0.5)",
                zIndex: 0,
              }
            : {}),
        } as React.CSSProperties
      }
      ref={setNodeRef}
    >
      <options.itemComponent
        key={index}
        item={item}
        removeItem={removeItem}
        rootAttributes={attributes}
        handle={Handle}
      />
    </Card>
  );
};
