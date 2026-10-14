"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
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
import { ActionIcon, Button, Card, Fieldset, Group, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";

import { createId } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { formatWallDateTime, resolveWallDateTimeString } from "../countdown/recurrence";
import type { OptionDateTimeEvent } from "../options";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { CapturedStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputOwner } from "./static-owner";

const isEventList = (value: unknown): value is OptionDateTimeEvent[] =>
  Array.isArray(value) &&
  value.every(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      typeof entry.id === "string" &&
      "label" in entry &&
      typeof entry.label === "string" &&
      "targetUtc" in entry &&
      typeof entry.targetUtc === "string" &&
      "timeZone" in entry &&
      typeof entry.timeZone === "string" &&
      "recurrence" in entry &&
      (entry.recurrence === "none" || entry.recurrence === "yearly") &&
      (!("startUtc" in entry) || entry.startUtc === undefined || typeof entry.startUtc === "string"),
  );

export const WidgetDateTimeEventListInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"dateTimeEventList">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tEditor = useEventListTranslation(kind);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const fieldPath = `options.${property}`;
  const currentValue = form.values.options[property];
  const values = isEventList(currentValue) ? currentValue : options.defaultValue;
  const drag = useRef<{
    owner: CapturedStaticWidgetInputOwner;
    activeId: DragEndEvent["active"]["id"];
    onReorder: (overId: DragEndEvent["active"]["id"]) => void;
  } | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!owner.isCurrent() || Array.isArray(form.getValues().options[property])) return;
    if (!owner.isCurrent()) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [currentValue, fieldPath, form, options.defaultValue, owner, property]);

  useEffect(
    () => () => {
      drag.current = null;
    },
    [],
  );

  const setValues = (
    origin: CapturedStaticWidgetInputOwner,
    update: (current: OptionDateTimeEvent[]) => OptionDateTimeEvent[],
  ) => {
    if (!origin.isCurrent()) return false;
    const current = form.getValues().options[property];
    const currentValues = isEventList(current) ? current : options.defaultValue;
    const nextValues = update(currentValues);
    if (nextValues === currentValues || !origin.isCurrent()) return false;
    form.setFieldValue(fieldPath, nextValues);
    return origin.isCurrent();
  };
  const addEvent = () => {
    if (!owner.isCurrent()) return;
    setValues(owner, (current) => {
      if (current.length >= options.maxValues) return current;
      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const target = dayjs().add(1, "day").minute(0).second(0).millisecond(0);
      return [
        ...current,
        {
          id: createId(),
          label: tEditor("newEvent"),
          targetUtc: target.toISOString(),
          timeZone: localTimeZone,
          recurrence: "none",
        },
      ];
    });
  };

  return (
    <Fieldset legend={t("label")}>
      <Stack gap="sm">
        {options.withDescription && (
          <Text size="sm" c="dimmed">
            {t("description")}
          </Text>
        )}

        <Button
          type="button"
          variant="light"
          leftSection={<IconPlus size="var(--mantine-font-size-md)" />}
          onClick={addEvent}
          disabled={values.length >= options.maxValues}
        >
          {tEditor("add")}
        </Button>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            if (!owner.isCurrent()) return;
            if (drag.current) return;
            const activeId = active.id;
            const current = form.getValues().options[property];
            const currentValues = isEventList(current) ? current : options.defaultValue;
            if (!currentValues.some(({ id }) => id === active.id) || !owner.isCurrent()) return;
            drag.current = {
              owner,
              activeId,
              onReorder: (overId) => {
                if (!owner.isCurrent()) return;
                setValues(owner, (currentList) => {
                  const activeIndex = currentList.findIndex(({ id }) => id === activeId);
                  const overIndex = currentList.findIndex(({ id }) => id === overId);
                  if (activeIndex < 0 || overIndex < 0) return currentList;
                  return arrayMove(currentList, activeIndex, overIndex);
                });
              },
            };
          }}
          onDragEnd={({ active, over }) => {
            const operation = drag.current;
            if (operation && operation.owner !== owner && !owner.isCurrent()) return;
            drag.current = null;
            if (!operation || operation.activeId !== active.id || !operation.owner.isCurrent()) return;
            if (!over || active.id === over.id) return;
            operation.onReorder(over.id);
          }}
          onDragCancel={() => {
            if (drag.current && drag.current.owner !== owner && !owner.isCurrent()) return;
            drag.current = null;
          }}
        >
          <SortableContext items={values.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {values.map((event) => (
                <SortableEvent
                  key={event.id}
                  kind={kind}
                  event={event}
                  owner={owner}
                  timeZoneOptions={options.timeZoneOptions}
                  onChange={(origin, update) => {
                    if (!origin.isCurrent()) return;
                    setValues(origin, (current) => {
                      const currentEvent = current.find(({ id }) => id === event.id);
                      if (!currentEvent) return current;
                      const nextEvent = update(currentEvent);
                      if (nextEvent === currentEvent) return current;
                      return current.map((candidate) => {
                        if (candidate.id === event.id) return nextEvent;
                        return candidate;
                      });
                    });
                  }}
                  onRemove={(origin) => {
                    if (!origin.isCurrent()) return;
                    setValues(origin, (current) => {
                      if (!current.some(({ id }) => id === event.id)) return current;
                      return current.filter((candidate) => candidate.id !== event.id);
                    });
                  }}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>

        <Text size="xs" c="dimmed">
          {tEditor("limit", { count: values.length, maximum: options.maxValues })}
        </Text>
      </Stack>
    </Fieldset>
  );
};

interface SortableEventProps {
  kind: WidgetKind;
  event: OptionDateTimeEvent;
  timeZoneOptions: readonly { value: string; label: string }[];
  owner: CapturedStaticWidgetInputOwner;
  onChange: (
    origin: CapturedStaticWidgetInputOwner,
    update: (current: OptionDateTimeEvent) => OptionDateTimeEvent,
  ) => void;
  onRemove: (origin: CapturedStaticWidgetInputOwner) => void;
}

const SortableEvent = ({ kind, event, timeZoneOptions, owner, onChange, onRemove }: SortableEventProps) => {
  const t = useEventListTranslation(kind);
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
  });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };
  const hasCurrentTimeZone = timeZoneOptions.some(({ value }) => value === event.timeZone);
  const selectableTimeZones = hasCurrentTimeZone
    ? timeZoneOptions
    : [{ value: event.timeZone, label: t("unsupportedOption", { timeZone: event.timeZone }) }, ...timeZoneOptions];
  const targetValue = formatWallDateTime(event.targetUtc, event.timeZone);
  const startValue = event.startUtc ? formatWallDateTime(event.startUtc, event.timeZone) : null;

  const changeTimeZone = (origin: CapturedStaticWidgetInputOwner, timeZone: string | null) => {
    if (!timeZone || !origin.isCurrent()) return;
    onChange(origin, (current) => {
      const currentTarget = formatWallDateTime(current.targetUtc, current.timeZone);
      const currentStart = current.startUtc ? formatWallDateTime(current.startUtc, current.timeZone) : null;
      const target = resolveWallDateTimeString(currentTarget, timeZone);
      const start = currentStart ? resolveWallDateTimeString(currentStart, timeZone) : null;
      return {
        ...current,
        timeZone,
        targetUtc: target?.toISOString() ?? current.targetUtc,
        startUtc: current.startUtc ? (start?.toISOString() ?? current.startUtc) : undefined,
      };
    });
  };

  const updateWallDateTime = (
    origin: CapturedStaticWidgetInputOwner,
    value: string | null,
    field: "targetUtc" | "startUtc",
  ) => {
    if (!value || !origin.isCurrent()) return;
    onChange(origin, (current) => {
      if (field === "startUtc" && (current.startUtc === undefined || current.recurrence !== "none")) return current;
      const resolved = resolveWallDateTimeString(value, current.timeZone);
      if (!resolved) return current;
      return { ...current, [field]: resolved.toISOString() };
    });
  };
  const timezoneSelect = useEventSelect(
    owner,
    selectableTimeZones.find(({ value }) => value === event.timeZone)?.label ?? "",
    changeTimeZone,
  );
  const recurrenceSelect = useEventSelect(owner, t(`recurrenceOption.${event.recurrence}`), (origin, recurrence) => {
    if ((recurrence !== "none" && recurrence !== "yearly") || !origin.isCurrent()) return;
    onChange(origin, (current) => ({ ...current, recurrence }));
  });

  return (
    <Card ref={setNodeRef} withBorder p="sm" style={style}>
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="end">
          <ActionIcon
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={t("reorder", { event: event.label })}
            style={{ cursor: "grab" }}
          >
            <IconGripVertical size="var(--mantine-font-size-lg)" />
          </ActionIcon>
          <TextInput
            flex={1}
            label={t("eventLabel")}
            value={event.label}
            maxLength={64}
            onChange={(changeEvent) => {
              if (!owner.isCurrent()) return;
              const label = changeEvent.currentTarget.value;
              if (!owner.isCurrent()) return;
              onChange(owner, (current) => ({ ...current, label }));
            }}
          />
          <ActionIcon
            color="red"
            variant="subtle"
            size="lg"
            aria-label={t("remove", { event: event.label })}
            onClick={() => {
              if (!owner.isCurrent()) return;
              onRemove(owner);
            }}
          >
            <IconTrash size="var(--mantine-font-size-lg)" />
          </ActionIcon>
        </Group>

        <Group align="end" grow>
          <Select
            {...timezoneSelect}
            label={t("timezone")}
            searchable
            data={selectableTimeZones}
            value={event.timeZone}
          />
          <Select
            {...recurrenceSelect}
            label={t("recurrence")}
            value={event.recurrence}
            data={(["none", "yearly"] as const).map((value) => ({ value, label: t(`recurrenceOption.${value}`) }))}
          />
        </Group>

        <ConfirmedDateTimePicker
          owner={owner}
          label={t("target")}
          value={targetValue || null}
          onChange={(origin, value) => updateWallDateTime(origin, value, "targetUtc")}
          confirmLabel={t("confirmDateTime")}
        />

        {event.recurrence === "none" && (
          <>
            <Switch
              label={t("trackProgress")}
              checked={event.startUtc !== undefined}
              onChange={(changeEvent) => {
                if (!owner.isCurrent()) return;
                const checked = changeEvent.currentTarget.checked;
                if (!owner.isCurrent()) return;
                onChange(owner, (current) => {
                  if (current.recurrence !== "none") return current;
                  if (!checked) {
                    const nextEvent = { ...current };
                    delete nextEvent.startUtc;
                    return nextEvent;
                  }
                  return { ...current, startUtc: new Date().toISOString() };
                });
              }}
            />
            {event.startUtc && (
              <ConfirmedDateTimePicker
                owner={owner}
                label={t("start")}
                value={startValue}
                onChange={(origin, value) => updateWallDateTime(origin, value, "startUtc")}
                confirmLabel={t("confirmDateTime")}
              />
            )}
          </>
        )}
      </Stack>
    </Card>
  );
};

interface ConfirmedDateTimePickerProps {
  label: string;
  value: string | null;
  confirmLabel: string;
  owner: CapturedStaticWidgetInputOwner;
  onChange: (origin: CapturedStaticWidgetInputOwner, value: string | null) => void;
}

const ConfirmedDateTimePicker = ({ label, value, confirmLabel, owner, onChange }: ConfirmedDateTimePickerProps) => {
  const [draft, setDraft] = useState({ owner, value });
  const operation = useRef<{
    owner: CapturedStaticWidgetInputOwner;
    active: boolean;
    onChange: ConfirmedDateTimePickerProps["onChange"];
  } | null>(null);

  useEffect(() => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (retained?.active && (retained.owner !== owner || !retained.owner.isCurrent())) return;
    setDraft({ owner, value });
  }, [owner, value]);

  useEffect(
    () => () => {
      if (operation.current) operation.current.active = false;
    },
    [],
  );

  const beginEdit = () => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (retained?.active && retained.owner.isCurrent()) return;
    operation.current = { owner, active: true, onChange };
    if (!owner.isCurrent()) return;
    setDraft({ owner, value });
  };

  const resetDraft = () => {
    const retained = operation.current;
    if (!retained) return;
    if (retained.owner !== owner && !owner.isCurrent()) return;
    retained.active = false;
    if (!retained.owner.isCurrent() || retained.owner !== owner) return;
    setDraft({ owner: retained.owner, value });
  };

  const changeDraft = (nextValue: string | null) => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (!retained?.active || !retained.owner.isCurrent()) return;
    setDraft({ owner: retained.owner, value: nextValue });
  };

  const confirmDraft = () => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (!retained?.active || !retained.owner.isCurrent() || draft.owner !== retained.owner || !draft.value) return;
    retained.onChange(retained.owner, draft.value);
  };

  return (
    <DateTimePicker
      label={label}
      value={draft.value}
      valueFormat="YYYY-MM-DD HH:mm"
      onFocusCapture={(event) => {
        if (event.currentTarget.tagName === "BUTTON") beginEdit();
      }}
      onPointerDownCapture={(event) => {
        if (event.currentTarget.tagName === "BUTTON") beginEdit();
      }}
      onKeyDownCapture={(event) => {
        if (!event.repeat && event.currentTarget.tagName === "BUTTON") beginEdit();
      }}
      timePickerProps={{
        withDropdown: true,
        popoverProps: { withinPortal: false },
        onFocusCapture: beginEdit,
        onPointerDownCapture: beginEdit,
        onKeyDownCapture: (event) => {
          if (!event.repeat && event.key !== "Enter") beginEdit();
        },
      }}
      popoverProps={{
        withinPortal: true,
        onOpen: () => {
          if (!operation.current) beginEdit();
        },
      }}
      submitButtonProps={{ "aria-label": confirmLabel, onClick: confirmDraft }}
      onChange={changeDraft}
      onDropdownClose={resetDraft}
    />
  );
};

const useEventSelect = (
  owner: CapturedStaticWidgetInputOwner,
  label: string,
  onChange: (origin: CapturedStaticWidgetInputOwner, value: string | null) => void,
) => {
  const operation = useRef<{
    owner: CapturedStaticWidgetInputOwner;
    active: boolean;
    onChange: typeof onChange;
  } | null>(null);
  const [search, setSearch] = useState({ owner, value: label });
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (retained?.active && !retained.owner.isCurrent()) return;
    setSearch({ owner, value: label });
  }, [label, owner]);

  useEffect(
    () => () => {
      if (operation.current) operation.current.active = false;
    },
    [],
  );

  const begin = () => {
    if (!owner.isCurrent()) return;
    const retained = operation.current;
    if (retained?.active && retained.owner.isCurrent()) return;
    operation.current = { owner, active: true, onChange };
    if (!owner.isCurrent()) return;
    setSearch({ owner, value: label });
  };

  const close = () => {
    const retained = operation.current;
    if (!retained) return;
    if (retained.owner !== owner && !owner.isCurrent()) return;
    retained.active = false;
    if (!owner.isCurrent() || !retained.owner.isCurrent()) return;
    setOpened(false);
    if (!retained.owner.isCurrent()) return;
    setSearch({ owner: retained.owner, value: label });
  };

  return {
    searchValue: search.value,
    dropdownOpened: opened && owner.isCurrent() && !!operation.current?.active && operation.current.owner.isCurrent(),
    onFocusCapture: begin,
    onPointerDownCapture: begin,
    onKeyDownCapture: (event: KeyboardEvent<HTMLInputElement>) => {
      if (!event.repeat) begin();
    },
    onDropdownOpen: () => {
      if (!owner.isCurrent()) return;
      if (!operation.current) begin();
      const retained = operation.current;
      if (!retained?.active || !retained.owner.isCurrent()) return;
      setOpened(true);
    },
    onDropdownClose: close,
    onBlur: close,
    onSearchChange: (nextSearch: string) => {
      if (!owner.isCurrent()) return;
      const retained = operation.current;
      if (!retained?.active || !retained.owner.isCurrent()) return;
      setSearch({ owner: retained.owner, value: nextSearch });
    },
    onChange: (nextValue: string | null) => {
      if (!owner.isCurrent()) return;
      const retained = operation.current;
      if (retained) {
        if (!retained.active || !retained.owner.isCurrent()) return;
        retained.onChange(retained.owner, nextValue);
        return;
      }
      if (!owner.isCurrent()) return;
      onChange(owner, nextValue);
    },
  };
};

type EventListTranslationKey =
  | "newEvent"
  | "add"
  | "remove"
  | "reorder"
  | "eventLabel"
  | "timezone"
  | "unsupportedOption"
  | "recurrence"
  | "recurrenceOption.none"
  | "recurrenceOption.yearly"
  | "target"
  | "trackProgress"
  | "start"
  | "confirmDateTime"
  | "limit";

type EventListTranslation = (key: EventListTranslationKey, values?: Record<string, string | number>) => string;

const useEventListTranslation = (kind: WidgetKind) =>
  useI18n(`widget.${kind}.dateTimeEventList` as never) as unknown as EventListTranslation;
