import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { ActionIcon, Card, Center, Fieldset, Loader, Stack } from "@mantine/core";
import { IconGripHorizontal } from "@tabler/icons-react";

import { useWidgetInputTranslation } from "./common";
import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

export const WidgetSortedItemListInput = <TItem, TOptionValue extends UniqueIdentifier>({
  property,
  options,
  initialOptions,
  kind,
}: CommonWidgetInputProps<"sortableItemList">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const fieldPath = `options.${property}`;
  const initialValues = useMemo(
    () =>
      Array.isArray(initialOptions[property]) ? (initialOptions[property] as TOptionValue[]) : options.defaultValue,
    [initialOptions, options.defaultValue, property],
  );
  const currentValue = form.values.options[property];
  const values = Array.isArray(currentValue) ? (currentValue as TOptionValue[]) : options.defaultValue;
  const { data, isLoading, error } = options.useData(initialValues);
  const dataMap = useMemo(
    () => new Map(data?.map((item) => [options.uniqueIdentifier(item), item as TItem])),
    [data, options],
  );
  const [tempMap, setTempMap] = useState<Map<TOptionValue, TItem>>(new Map());

  const [activeId, setActiveId] = useState<TOptionValue | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const isFirstAnnouncement = useRef(true);
  const getIndex = (id: TOptionValue) => values.indexOf(id);
  const activeIndex = activeId ? getIndex(activeId) : -1;

  useEffect(() => {
    if (Array.isArray(currentValue)) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [currentValue, fieldPath, form, options.defaultValue]);

  useEffect(() => {
    if (!activeId) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  const getItem = useCallback(
    (id: TOptionValue) => {
      if (!tempMap.has(id)) {
        return dataMap.get(id);
      }

      return tempMap.get(id);
    },
    [tempMap, dataMap],
  );

  const updateItems = useCallback(
    (callback: (prev: TOptionValue[]) => TOptionValue[]) => {
      form.setFieldValue(fieldPath, callback);
    },
    [fieldPath, form],
  );

  const addItem = (item: TItem) => {
    setTempMap((prev) => {
      const next = new Map(prev);
      next.set(options.uniqueIdentifier(item) as TOptionValue, item);
      return next;
    });
    updateItems((currentValues) => [...currentValues, options.uniqueIdentifier(item) as TOptionValue]);
  };

  const migrateItems = useCallback(
    (items: TItem[], optionsPatch: Record<string, unknown>) => {
      const migratedEntries = items.map((item) => [options.uniqueIdentifier(item) as TOptionValue, item] as const);
      setTempMap((previous) => {
        const next = new Map(previous);
        for (const [value, item] of migratedEntries) next.set(value, item);
        return next;
      });
      form.setFieldValue("options", (currentOptions) => {
        const currentItems = Array.isArray(currentOptions[property])
          ? (currentOptions[property] as TOptionValue[])
          : options.defaultValue;
        const nextItems = [...currentItems];
        for (const [value] of migratedEntries) {
          if (!nextItems.includes(value)) nextItems.push(value);
        }
        return { ...currentOptions, ...optionsPatch, [property]: nextItems };
      });
    },
    [form, options, property],
  );

  const removeItem = useCallback(
    (value: TOptionValue) => {
      updateItems((currentValues) => currentValues.filter((candidate) => candidate !== value));
      setTempMap((previous) => {
        if (!previous.has(value)) return previous;
        const next = new Map(previous);
        next.delete(value);
        return next;
      });
    },
    [updateItems],
  );

  return (
    <Fieldset legend={t("label")}>
      <Stack>
        <options.addButton
          addItem={addItem}
          migrateItems={migrateItems}
          removeItem={removeItem}
          values={values}
          initialOptions={initialOptions}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!active) {
              return;
            }

            setActiveId(active.id as TOptionValue);
          }}
          onDragEnd={({ over }) => {
            setActiveId(null);

            if (over) {
              const overIndex = getIndex(over.id as TOptionValue);
              if (activeIndex !== overIndex) {
                updateItems((items) => arrayMove(items, activeIndex, overIndex));
              }
            }
          }}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={values} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              <React.Fragment>
                {values.map((value, index) => {
                  const item = getItem(value);
                  if (!item) {
                    return null;
                  }

                  return (
                    <MemoizedItem
                      key={value}
                      id={value}
                      index={index}
                      item={item}
                      removeItem={() => removeItem(value)}
                      removeLabel={t("remove")}
                      options={options}
                    />
                  );
                })}
                {isLoading && (
                  <Center h={256}>
                    <Loader />
                  </Center>
                )}
                {error ? <Center h={256}>{JSON.stringify(error)}</Center> : null}
              </React.Fragment>
            </Stack>
          </SortableContext>
        </DndContext>
      </Stack>
    </Fieldset>
  );
};

interface ItemProps<TItem, TOptionValue extends UniqueIdentifier> {
  id: TOptionValue;
  item: TItem;
  index: number;
  removeItem: () => void;
  removeLabel: string;
  options: CommonWidgetInputProps<"sortableItemList">["options"];
}

const Item = <TItem, TOptionValue extends UniqueIdentifier>({
  id,
  index,
  item,
  removeItem,
  removeLabel,
  options,
}: ItemProps<TItem, TOptionValue>) => {
  const { attributes, isDragging, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id,
  });

  return (
    <Card
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
        removeLabel={removeLabel}
        rootAttributes={attributes}
        handle={
          <ActionIcon
            variant="transparent"
            color="gray"
            {...listeners}
            ref={setActivatorNodeRef}
            style={{ cursor: "grab" }}
          >
            <IconGripHorizontal />
          </ActionIcon>
        }
      />
    </Card>
  );
};

const MemoizedItem = memo(Item);
