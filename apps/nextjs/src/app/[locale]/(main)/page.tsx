"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { DraggableAttributes, DropAnimation, UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
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
import { ActionIcon, Anchor, Avatar, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconGripHorizontal, IconX } from "@tabler/icons-react";
import { createPortal } from "react-dom";

import { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createModal, useModalAction } from "@homarr/modals";

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

const Modal = createModal(({ actions }) => {
  const [items, setItems] = useState<UniqueIdentifier[]>([]);
  const { data } = clientApi.app.all.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (data) {
      setItems(data.map((item) => item.id));
    }
  }, [data]);
  const appMap = new Map(data?.map((app) => [app.id, app]) ?? []);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const isFirstAnnouncement = useRef(true);
  const getIndex = (id: UniqueIdentifier) => items.indexOf(id);
  const getPosition = (id: UniqueIdentifier) => getIndex(id) + 1;
  const activeIndex = activeId ? getIndex(activeId) : -1;
  const handleRemove = (id: UniqueIdentifier) => setItems((items) => items.filter((item) => item !== id));

  useEffect(() => {
    if (!activeId) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
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
            setItems((items) => arrayMove(items, activeIndex, overIndex));
          }
        }
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <Stack gap="xs">
          {items.map((value, index) => (
            <AppItem key={value} id={value} app={appMap.get(value as string)!} index={index} onRemove={handleRemove} />
          ))}
        </Stack>
      </SortableContext>
      {createPortal(
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeId ? <AppItem index={undefined} id={activeId} app={appMap.get(activeId as string)!} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}).withOptions({
  defaultTitle: "Modal",
});

interface AppItemProps {
  app: RouterOutputs["app"]["all"][number];
  id: UniqueIdentifier;
  index: number | undefined;
  onRemove?: (id: UniqueIdentifier) => void;
}

const AppItem = memo(({ id, app, index, onRemove }: AppItemProps) => {
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
      <Group {...attributes} tabIndex={0} justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          <ActionIcon
            variant="transparent"
            color="gray"
            {...listeners}
            ref={setActivatorNodeRef}
            style={{ cursor: "grab" }}
          >
            <IconGripHorizontal />
          </ActionIcon>

          <Group>
            <Avatar src={app.iconUrl} alt={app.name} />
            <Stack gap={0}>
              <Text>{app.name}</Text>
              {app.href && (
                <Anchor href={app.href} target="_blank" rel="noopener noreferrer">
                  {app.href}
                </Anchor>
              )}
            </Stack>
          </Group>
        </Group>

        <ActionIcon variant="transparent" color="red" onClick={() => onRemove?.(id)}>
          <IconX size={20} />
        </ActionIcon>
      </Group>
    </Card>
  );
});

export default function HomePage() {
  const { openModal } = useModalAction(Modal);

  return (
    <Stack>
      <Title>Home</Title>

      <Button onClick={openModal}>Open modal</Button>
    </Stack>
  );
}

const testApps = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
];
