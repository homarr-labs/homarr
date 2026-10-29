import type { ReactNode } from "react";
import { ActionIcon, Badge, Button, Group, NumberInput, Select, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type { SmartContainerOptions, SmartContainerState } from "@homarr/validation/shared";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import type { Item } from "~/app/[locale]/boards/_types";
import classes from "./container-editor.module.css";

interface StateEditorProps {
  smart: SmartContainerOptions;
  selectedStateId: string;
  onSelectState: (id: string) => void;
  onChange: (smart: SmartContainerOptions) => void;
  onAddState: (offset: number) => void;
  onDeleteState: () => void;
}

export const ContainerStateSettings = ({
  smart,
  selectedStateId,
  onSelectState,
  onChange,
  onAddState,
  onDeleteState,
}: StateEditorProps) => {
  const t = useI18n("section.container.smart");
  const stateIndex = smart.states.findIndex((state) => state.id === selectedStateId);
  const selected = smart.states[stateIndex];
  if (!selected) return null;
  const changeSelected = (patch: Partial<SmartContainerState>) =>
    onChange({
      ...smart,
      states: smart.states.map((state) => {
        if (state.id !== selected.id) return state;
        return { ...state, ...patch };
      }),
    });
  const moveState = (direction: number) => {
    const nextIndex = stateIndex + direction;
    if (nextIndex < 0 || nextIndex >= smart.states.length) return;
    const states = [...smart.states];
    const target = states[nextIndex];
    if (!target) return;
    states[nextIndex] = selected;
    states[stateIndex] = target;
    onChange({ ...smart, states });
  };
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {t("statesDescription")}
      </Text>
      <Stack gap={6}>
        {smart.states.map((state, index) => (
          <Button
            key={state.id}
            className={classes.stateButton}
            variant={state.id === selected.id ? "light" : "default"}
            onClick={() => onSelectState(state.id)}
            fullWidth
            leftSection={
              <Badge size="sm" variant="light">
                {index + 1}
              </Badge>
            }
            rightSection={
              <Text size="xs" c="dimmed">
                {state.itemIds.length}
              </Text>
            }
          >
            {state.title || t("state")}
          </Button>
        ))}
      </Stack>
      <TextInput
        label={t("stateTitle")}
        value={selected.title}
        maxLength={64}
        onChange={(event) => changeSelected({ title: event.currentTarget.value })}
      />
      <NumberInput
        label={t("priority")}
        description={t("priorityDescription")}
        value={selected.priority}
        min={0}
        max={100}
        allowDecimal={false}
        onChange={(value) => {
          if (typeof value === "number") changeSelected({ priority: value });
        }}
      />
      <Group gap="xs" grow>
        <Button
          variant="default"
          mih={44}
          leftSection={<IconArrowUp size={16} />}
          onClick={() => moveState(-1)}
          disabled={stateIndex === 0}
        >
          {t("moveUp")}
        </Button>
        <Button
          variant="default"
          mih={44}
          leftSection={<IconArrowDown size={16} />}
          onClick={() => moveState(1)}
          disabled={stateIndex === smart.states.length - 1}
        >
          {t("moveDown")}
        </Button>
      </Group>
      <Group gap="xs" grow>
        <Button
          variant="light"
          mih={44}
          leftSection={<IconPlus size={16} />}
          disabled={smart.states.length >= 32}
          onClick={() => onAddState(0)}
        >
          {t("addStateAbove")}
        </Button>
        <Button
          variant="light"
          mih={44}
          leftSection={<IconPlus size={16} />}
          disabled={smart.states.length >= 32}
          onClick={() => onAddState(1)}
        >
          {t("addStateBelow")}
        </Button>
      </Group>
      <Button
        color="red"
        variant="subtle"
        mih={44}
        leftSection={<IconTrash size={16} />}
        disabled={smart.states.length <= 1}
        onClick={onDeleteState}
      >
        {t("deleteState")}
      </Button>
      <Text size="xs" c="dimmed">
        {t("deleteStateDescription")}
      </Text>
    </Stack>
  );
};

interface ContainerStatePreviewProps {
  smart: SmartContainerOptions;
  selectedStateId: string;
  items: Item[];
  title: string;
  preview: ReactNode;
  loadingItemId: string | null;
  onSelectState: (id: string) => void;
  onAddItem: (index: number) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: number) => void;
  onMoveItemToState: (itemId: string, stateId: string) => void;
}

export const ContainerStatePreview = ({
  smart,
  selectedStateId,
  items,
  title,
  preview,
  loadingItemId,
  onSelectState,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onMoveItemToState,
}: ContainerStatePreviewProps) => {
  const t = useI18n("section.container.smart");
  const translate = useI18n();
  const stateIndex = smart.states.findIndex((state) => state.id === selectedStateId);
  const selected = smart.states[stateIndex];
  if (!selected) return null;
  const previous = smart.states[(stateIndex - 1 + smart.states.length) % smart.states.length];
  const next = smart.states[(stateIndex + 1) % smart.states.length];
  return (
    <Stack className={classes.preview} gap="sm">
      <Group justify="space-between" gap="xs">
        <Text fw={600} truncate>
          {title || t("edit")}
        </Text>
        <Badge variant="light">{t("preview")}</Badge>
      </Group>
      <Group grow gap="xs" wrap="nowrap">
        <Button
          variant="default"
          mih={44}
          leftSection={<IconChevronLeft size={18} />}
          disabled={smart.states.length < 2}
          aria-label={t("previousState")}
          onClick={() => {
            if (previous) onSelectState(previous.id);
          }}
        >
          {translate("common.action.previous")}
        </Button>
        <Button
          variant="default"
          mih={44}
          rightSection={<IconChevronRight size={18} />}
          disabled={smart.states.length < 2}
          aria-label={t("nextState")}
          onClick={() => {
            if (next) onSelectState(next.id);
          }}
        >
          {translate("common.action.next")}
        </Button>
      </Group>
      {preview}
      <Stack className={classes.reel} gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} truncate>
            {selected.title || t("state")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("position", { current: stateIndex + 1, total: smart.states.length })}
          </Text>
        </Group>
        <Button
          className={classes.insert}
          variant="default"
          leftSection={<IconPlus size={16} />}
          onClick={() => onAddItem(0)}
        >
          {t("addWidgetAbove")}
        </Button>
        {selected.itemIds.map((itemId, index) => {
          const item = items.find((candidate) => candidate.id === itemId);
          if (!item) return null;
          const Icon = widgetCatalogIcons[item.kind];
          const name = item.advancedOptions.title?.trim() || getWidgetName(item.kind, translate);
          return (
            <Stack key={item.id} gap="xs">
              <Stack className={classes.widget} gap="xs">
                <Group gap="xs" wrap="nowrap">
                  <Icon size={20} />
                  <Text fw={500} size="sm" style={{ flex: 1 }} truncate>
                    {name}
                  </Text>
                  <Tooltip label={t("editWidget")}>
                    <ActionIcon
                      size={44}
                      variant="default"
                      loading={loadingItemId === item.id}
                      disabled={loadingItemId !== null && loadingItemId !== item.id}
                      aria-label={t("editNamedWidget", { name })}
                      onClick={() => onEditItem(item)}
                    >
                      <IconPencil size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Group gap="xs" justify="space-between">
                  <Group gap={4}>
                    <ActionIcon
                      size={44}
                      variant="subtle"
                      aria-label={t("moveWidgetUp", { name })}
                      disabled={index === 0}
                      onClick={() => onMoveItem(item.id, -1)}
                    >
                      <IconArrowUp size={18} />
                    </ActionIcon>
                    <ActionIcon
                      size={44}
                      variant="subtle"
                      aria-label={t("moveWidgetDown", { name })}
                      disabled={index === selected.itemIds.length - 1}
                      onClick={() => onMoveItem(item.id, 1)}
                    >
                      <IconArrowDown size={18} />
                    </ActionIcon>
                  </Group>
                  <Button
                    size="xs"
                    mih={44}
                    color="red"
                    variant="subtle"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => onDeleteItem(item.id)}
                  >
                    {t("deleteWidget")}
                  </Button>
                </Group>
                {smart.states.length > 1 && (
                  <Select
                    label={t("moveToState")}
                    value={selected.id}
                    data={smart.states.map((state, statePosition) => ({
                      value: state.id,
                      label: state.title || `${t("state")} ${statePosition + 1}`,
                    }))}
                    allowDeselect={false}
                    onChange={(id) => {
                      if (id) onMoveItemToState(item.id, id);
                    }}
                  />
                )}
              </Stack>
              <Button
                className={classes.insert}
                variant="default"
                leftSection={<IconPlus size={16} />}
                onClick={() => onAddItem(index + 1)}
              >
                {t("addWidgetBelow")}
              </Button>
            </Stack>
          );
        })}
        {selected.itemIds.length === 0 && (
          <Text py="lg" size="sm" ta="center" c="dimmed">
            {t("empty")}
          </Text>
        )}
      </Stack>
      <Text size="xs" c="dimmed">
        {t("draftDescription")}
      </Text>
    </Stack>
  );
};
