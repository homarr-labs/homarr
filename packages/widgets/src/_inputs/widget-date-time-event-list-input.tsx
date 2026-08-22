"use client";

import { useEffect, useState } from "react";
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
import type { DateTimeEventRecurrence, OptionDateTimeEvent } from "../options";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetDateTimeEventListInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"dateTimeEventList">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tEditor = useEventListTranslation(kind);
  const form = useFormContext();
  const fieldPath = `options.${property}`;
  const currentValue = form.values.options[property];
  const values = Array.isArray(currentValue) ? (currentValue as OptionDateTimeEvent[]) : options.defaultValue;
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (Array.isArray(currentValue)) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [currentValue, fieldPath, form, options.defaultValue]);

  const setValues = (nextValues: OptionDateTimeEvent[]) => form.setFieldValue(fieldPath, nextValues);
  const addEvent = () => {
    if (values.length >= options.maxValues) return;
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const target = dayjs().add(1, "day").minute(0).second(0).millisecond(0);
    setValues([
      ...values,
      {
        id: createId(),
        label: tEditor("newEvent"),
        targetUtc: target.toISOString(),
        timeZone: localTimeZone,
        recurrence: "none",
      },
    ]);
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
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const activeIndex = values.findIndex(({ id }) => id === active.id);
            const overIndex = values.findIndex(({ id }) => id === over.id);
            if (activeIndex < 0 || overIndex < 0) return;
            setValues(arrayMove(values, activeIndex, overIndex));
          }}
        >
          <SortableContext items={values.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {values.map((event) => (
                <SortableEvent
                  key={event.id}
                  kind={kind}
                  event={event}
                  timeZoneOptions={options.timeZoneOptions}
                  onChange={(nextEvent) =>
                    setValues(values.map((candidate) => (candidate.id === event.id ? nextEvent : candidate)))
                  }
                  onRemove={() => setValues(values.filter((candidate) => candidate.id !== event.id))}
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
  onChange: (event: OptionDateTimeEvent) => void;
  onRemove: () => void;
}

const SortableEvent = ({ kind, event, timeZoneOptions, onChange, onRemove }: SortableEventProps) => {
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

  const changeTimeZone = (timeZone: string) => {
    const target = resolveWallDateTimeString(targetValue, timeZone);
    const start = startValue ? resolveWallDateTimeString(startValue, timeZone) : null;
    onChange({
      ...event,
      timeZone,
      targetUtc: target?.toISOString() ?? event.targetUtc,
      startUtc: event.startUtc ? (start?.toISOString() ?? event.startUtc) : undefined,
    });
  };

  const updateWallDateTime = (value: string | null, field: "targetUtc" | "startUtc") => {
    if (!value) return;
    const resolved = resolveWallDateTimeString(value, event.timeZone);
    if (!resolved) return;
    onChange({ ...event, [field]: resolved.toISOString() });
  };

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
            onChange={(changeEvent) => onChange({ ...event, label: changeEvent.currentTarget.value })}
          />
          <ActionIcon
            color="red"
            variant="subtle"
            size="lg"
            aria-label={t("remove", { event: event.label })}
            onClick={onRemove}
          >
            <IconTrash size="var(--mantine-font-size-lg)" />
          </ActionIcon>
        </Group>

        <Group align="end" grow>
          <Select
            label={t("timezone")}
            searchable
            data={selectableTimeZones}
            value={event.timeZone}
            onChange={(timeZone) => {
              if (timeZone) changeTimeZone(timeZone);
            }}
          />
          <Select
            label={t("recurrence")}
            value={event.recurrence}
            data={(["none", "yearly"] as const).map((value) => ({ value, label: t(`recurrenceOption.${value}`) }))}
            onChange={(value) => {
              if (value) onChange({ ...event, recurrence: value as DateTimeEventRecurrence });
            }}
          />
        </Group>

        <ConfirmedDateTimePicker
          label={t("target")}
          value={targetValue || null}
          onChange={(value) => updateWallDateTime(value, "targetUtc")}
          confirmLabel={t("confirmDateTime")}
        />

        {event.recurrence === "none" && (
          <>
            <Switch
              label={t("trackProgress")}
              checked={event.startUtc !== undefined}
              onChange={(changeEvent) => {
                if (!changeEvent.currentTarget.checked) {
                  const nextEvent = { ...event };
                  delete nextEvent.startUtc;
                  onChange(nextEvent);
                  return;
                }
                onChange({ ...event, startUtc: new Date().toISOString() });
              }}
            />
            {event.startUtc && (
              <ConfirmedDateTimePicker
                label={t("start")}
                value={startValue}
                onChange={(value) => updateWallDateTime(value, "startUtc")}
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
  onChange: (value: string | null) => void;
}

const ConfirmedDateTimePicker = ({ label, value, confirmLabel, onChange }: ConfirmedDateTimePickerProps) => {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => setDraftValue(value), [value]);

  const resetDraft = () => setDraftValue(value);
  const confirmDraft = () => {
    if (!draftValue) return;
    onChange(draftValue);
  };

  return (
    <DateTimePicker
      label={label}
      value={draftValue}
      valueFormat="YYYY-MM-DD HH:mm"
      timePickerProps={{ withDropdown: true, popoverProps: { withinPortal: false } }}
      popoverProps={{ withinPortal: true }}
      submitButtonProps={{ "aria-label": confirmLabel, onClick: confirmDraft }}
      onChange={setDraftValue}
      onDropdownClose={resetDraft}
    />
  );
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
