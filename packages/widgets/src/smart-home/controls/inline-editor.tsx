"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
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
import {
  ActionIcon,
  Button,
  CloseButton,
  Divider,
  Group,
  Paper,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { IconGripVertical, IconLayoutGridAdd } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { BlockAdder, BlockRow, countCatalogBlocks, useBlockCatalog } from "./configuration";
import type { BlockContentFilter, BlockCatalog } from "./configuration";
import classes from "./configuration.module.css";
import type { SmartHomeOptionsPatch, SmartHomePresentation } from "./types";

const toTransform = (transform: ReturnType<typeof useSortable>["transform"]) => {
  if (!transform) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`;
};

interface SortableBlockProps {
  id: string;
  catalog: BlockCatalog;
  count: number | undefined;
  onRemove: () => void;
}

function SortableBlock({ id, catalog, count, onRemove }: SortableBlockProps) {
  const t = useI18n("widget.smartHome-controls");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: CSSProperties = {
    transform: toTransform(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <Paper ref={setNodeRef} withBorder radius="md" px="xs" py={6} style={style}>
      <BlockRow
        id={id}
        catalog={catalog}
        count={count}
        onRemove={onRemove}
        removeLabel={t("option.blocks.remove")}
        rootAttributes={attributes}
        handle={
          <ActionIcon
            ref={setActivatorNodeRef}
            {...listeners}
            variant="subtle"
            color="gray"
            aria-label={t("inline.handle")}
            className={classes.handle}
          >
            <IconGripVertical size={16} />
          </ActionIcon>
        }
      />
    </Paper>
  );
}

interface SmartHomeInlineEditorProps {
  integrationId: string | null;
  blocks: readonly string[];
  presentation: SmartHomePresentation;
  filter: BlockContentFilter;
  onChange: (patch: SmartHomeOptionsPatch) => void;
}

export function SmartHomeInlineEditor({
  integrationId,
  blocks,
  presentation,
  filter,
  onChange,
}: SmartHomeInlineEditorProps) {
  const t = useI18n("widget.smartHome-controls");
  const catalog = useBlockCatalog(integrationId);
  const counts = countCatalogBlocks(blocks, catalog, filter);
  const [opened, setOpened] = useState(false);
  const [dragging, setDragging] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setBlocks = (next: string[]) => onChange({ blocks: next });

  return (
    <div className={classes.inlineToolbar} data-grid-no-drag>
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-end"
        width={400}
        shadow="md"
        closeOnClickOutside={false}
        closeOnEscape={!dragging}
      >
        <Popover.Target>
          <Button
            size="compact-sm"
            variant="filled"
            leftSection={<IconLayoutGridAdd size={14} />}
            onClick={() => setOpened((value) => !value)}
            aria-expanded={opened}
          >
            {t("inline.open", { count: blocks.length })}
          </Button>
        </Popover.Target>
        <Popover.Dropdown data-grid-no-drag>
          <Stack gap="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text fw={700}>{t("inline.title")}</Text>
              <CloseButton size="sm" aria-label={t("inline.close")} onClick={() => setOpened(false)} />
            </Group>
            <SegmentedControl<SmartHomePresentation>
              size="xs"
              fullWidth
              value={presentation}
              onChange={(value) => onChange({ presentation: value })}
              data={[
                { value: "entities", label: t("option.presentation.option.entities") },
                { value: "controlPanel", label: t("option.presentation.option.controlPanel") },
              ]}
            />
            <ScrollArea.Autosize mah={260} type="auto" offsetScrollbars>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setDragging(true)}
                onDragCancel={() => setDragging(false)}
                onDragEnd={({ active, over }) => {
                  setDragging(false);
                  if (!over || active.id === over.id) return;
                  const from = blocks.indexOf(String(active.id));
                  const to = blocks.indexOf(String(over.id));
                  if (from === -1 || to === -1) return;
                  setBlocks(arrayMove([...blocks], from, to));
                }}
              >
                <SortableContext items={[...blocks]} strategy={verticalListSortingStrategy}>
                  <Stack gap={6}>
                    {blocks.map((id) => (
                      <SortableBlock
                        key={id}
                        id={id}
                        catalog={catalog}
                        count={counts?.get(id)}
                        onRemove={() => setBlocks(blocks.filter((candidate) => candidate !== id))}
                      />
                    ))}
                    {blocks.length === 0 && (
                      <Text size="sm" c="dimmed">
                        {t("inline.empty")}
                      </Text>
                    )}
                  </Stack>
                </SortableContext>
              </DndContext>
            </ScrollArea.Autosize>
            <Divider label={t("inline.add")} labelPosition="left" />
            <BlockAdder catalog={catalog} values={blocks} onAdd={(ids) => setBlocks([...blocks, ...ids])} />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
