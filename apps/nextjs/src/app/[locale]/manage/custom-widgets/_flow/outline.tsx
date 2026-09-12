"use client";
import type { ReactNode } from "react";
import { ActionIcon, Badge, Button, Checkbox, Group, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconSearch, IconSettings, IconX } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import type { FlowKind, WidgetNode } from "./graph";
import { WorkbenchNodeLibrary } from "./library";
import classes from "./workbench.module.css";
export function WorkbenchOutline({
  nodes,
  selectedIds,
  selected,
  search,
  onSearch,
  onSelect,
  onClose,
  onToggle,
  onAdd,
  onGroup,
  onUngroup,
  editable,
  start,
}: {
  nodes: WidgetNode[];
  start?: ReactNode;
  selectedIds: string[];
  selected: string;
  search: string;
  onSearch(value: string): void;
  onSelect(id: string): void;
  onClose(): void;
  onToggle(id: string): void;
  editable: boolean;
  onAdd(kind: FlowKind): void;
  onGroup(): void;
  onUngroup(): void;
}) {
  const t = useI18n("customWidget.flow");
  const query = search.trim().toLowerCase();
  const filtered = nodes.filter((node) =>
    `${node.data.label} ${node.data.identifier} ${node.data.summary} ${t(`kind.${node.data.kind}`)}`
      .toLowerCase()
      .includes(query),
  );
  const selectedNodes = nodes.filter((node) => selectedIds.includes(node.id));
  return (
    <nav className={classes.library} aria-label={t("library")} data-workbench-library>
      {start}
      <TextInput
        size="xs"
        data-workbench-local-input
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (search) onSearch("");
            else onClose();
          }
        }}
        placeholder={t("search")}
        aria-label={t("search")}
        leftSection={<IconSearch size={14} />}
        rightSection={
          search && (
            <ActionIcon
              type="button"
              size="xs"
              variant="subtle"
              aria-label={t("clearSearch")}
              onClick={() => onSearch("")}
            >
              <IconX size={12} />
            </ActionIcon>
          )
        }
      />
      <WorkbenchNodeLibrary editable={editable} onAdd={onAdd} />
      <Group justify="space-between" gap={4} mt="md" mb="xs">
        <Text size="xs" fw={600} c="dimmed">
          {t("outline")}
        </Text>
        <Text size="xs" c="dimmed" aria-live="polite">
          {t("nodeCount", { visible: filtered.length, total: nodes.length })}
        </Text>
      </Group>
      <Stack gap={4}>
        {filtered.map((node) => (
          <Group key={node.id} className={classes.outlineRow} data-nested={!!node.parentId} gap={4} wrap="nowrap">
            <Checkbox
              size="xs"
              checked={selectedIds.includes(node.id)}
              onChange={() => onToggle(node.id)}
              aria-label={t("selectNode", { name: node.data.label })}
            />
            <UnstyledButton
              className={classes.outlineItem}
              data-selected={node.id === selected}
              aria-current={node.id === selected ? "true" : undefined}
              title={[node.data.label, node.data.summary].filter(Boolean).join(" · ")}
              onClick={() => onSelect(node.id)}
            >
              <Badge size="xs" variant="dot">
                {t(`kind.${node.data.kind}`)}
              </Badge>
              <Text size="xs" truncate mt={4}>
                {node.data.label}
              </Text>
              {node.data.summary && (
                <Text size="xs" c="dimmed" truncate>
                  {node.data.summary}
                </Text>
              )}
            </UnstyledButton>
          </Group>
        ))}
      </Stack>
      {filtered.length === 0 && (
        <Text size="xs" c="dimmed">
          {t("noNodes")}
        </Text>
      )}
      <Group mt="sm" gap={4}>
        <Button
          type="button"
          size="compact-xs"
          variant="subtle"
          disabled={selectedNodes.filter((node) => node.data.kind !== "group").length < 2}
          onClick={onGroup}
        >
          {t("group")}
        </Button>
        <Button
          type="button"
          size="compact-xs"
          variant="subtle"
          disabled={!selectedNodes.some((node) => node.data.kind === "group" || node.parentId)}
          onClick={onUngroup}
        >
          {t("ungroup")}
        </Button>
      </Group>
      <Button
        mt="sm"
        fullWidth
        variant="subtle"
        size="xs"
        leftSection={<IconSettings size={14} />}
        onClick={() => onSelect("general")}
      >
        {t("general")}
      </Button>
    </nav>
  );
}
