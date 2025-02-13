"use client";

import type { ReactNode, Ref } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DragEndEvent, DraggableAttributes, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Anchor, Box, Flex, Group, Table, TableTbody, TableTd, TableTh, TableThead, TableTr } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";
import { UserAvatarGroup } from "@homarr/ui";

interface GroupsTableProps {
  groups: RouterOutputs["group"]["getAll"];
  hasFilter: boolean;
}

export const GroupsTable = ({ groups, hasFilter }: GroupsTableProps) => {
  const t = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState(groups.map(({ id }) => id));

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    setGroupIds((groupIds) => {
      const oldIndex = groupIds.indexOf(active.id as string);
      const newIndex = groupIds.indexOf(over.id as string);
      return arrayMove(groupIds, oldIndex, newIndex);
    });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const selectedRow = useMemo(() => {
    if (!activeId) return null;

    const current = groups.find((group) => group.id === activeId);
    if (!current) return null;

    return <Row group={current} handle={<DragHandle attributes={undefined} listeners={undefined} active />} />;
  }, [activeId, groups]);

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
    >
      <Table striped highlightOnHover>
        <TableThead>
          <TableTr>
            <TableTh>{t("group.field.name")}</TableTh>
            <TableTh>{t("group.field.members")}</TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
            {groupIds.map((groupId) => {
              const group = groups.find(({ id }) => id === groupId);
              if (!group) return null;

              return <DraggableRow key={group.id} group={group} disabled={hasFilter} />;
            })}
          </SortableContext>
        </TableTbody>
      </Table>

      <DragOverlay>
        {activeId && (
          <Table w="100%">
            <TableTbody>{selectedRow}</TableTbody>
          </Table>
        )}
      </DragOverlay>
    </DndContext>
  );
};

interface DraggableRowProps {
  group: RouterOutputs["group"]["getAll"][number];
  disabled?: boolean;
}

const DraggableRow = ({ group, disabled }: DraggableRowProps) => {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({
    id: group.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
  };

  if (isDragging) {
    return (
      <TableTr ref={setNodeRef} style={style}>
        <TableTd colSpan={2}>&nbsp;</TableTd>
      </TableTr>
    );
  }

  return (
    <Row
      group={group}
      ref={setNodeRef}
      style={style}
      handle={<DragHandle attributes={attributes} listeners={listeners} active={false} disabled={disabled} />}
    />
  );
};

interface RowProps {
  group: RouterOutputs["group"]["getAll"][number];
  handle?: ReactNode;
  ref?: Ref<HTMLTableRowElement>;
  style?: React.CSSProperties;
}

const Row = ({ group, handle, ref, style }: RowProps) => {
  return (
    <TableTr ref={ref} style={style}>
      <TableTd>
        <Group>
          {handle}
          <Anchor component={Link} href={`/manage/users/groups/${group.id}`}>
            {group.name}
          </Anchor>
        </Group>
      </TableTd>
      <TableTd>
        <UserAvatarGroup users={group.members} size="sm" limit={5} />
      </TableTd>
    </TableTr>
  );
};

interface DragHandleProps {
  attributes: DraggableAttributes | undefined;
  listeners: SyntheticListenerMap | undefined;
  active: boolean;
  disabled?: boolean;
}

const DragHandle = ({ attributes, listeners, active, disabled }: DragHandleProps) => {
  if (disabled) {
    return <Box w={40} h="100%" />;
  }

  return (
    <Flex
      align="center"
      justify="center"
      h="100%"
      w={40}
      style={{ cursor: active ? "grabbing" : "grab" }}
      {...attributes}
      {...listeners}
    >
      <IconGripVertical size={18} stroke={1.5} />
    </Flex>
  );
};
