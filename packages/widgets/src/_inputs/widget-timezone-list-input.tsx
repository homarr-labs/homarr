"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ActionIcon, Button, Card, Fieldset, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";

import { createId } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { OptionTimezone } from "../options";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetTimezoneListInput = ({ property, kind, options }: CommonWidgetInputProps<"timezoneList">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tEditor = useTimezoneListTranslation(kind);
  const form = useFormContext();
  const fieldPath = `options.${property}`;
  const currentValue = form.values.options[property];
  const values = Array.isArray(currentValue) ? (currentValue as OptionTimezone[]) : options.defaultValue;
  const [selectedTimeZone, setSelectedTimeZone] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (Array.isArray(currentValue)) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [currentValue, fieldPath, form, options.defaultValue]);

  const usedTimeZones = useMemo(() => new Set(values.map(({ timeZone }) => timeZone)), [values]);
  const availableOptions = options.timeZoneOptions.map((option) => ({
    ...option,
    disabled: usedTimeZones.has(option.value),
  }));
  const isFull = values.length >= options.maxValues;

  const setValues = (nextValues: OptionTimezone[]) => form.setFieldValue(fieldPath, nextValues);
  const addCity = (city: OptionTimezone) => {
    if (isFull || usedTimeZones.has(city.timeZone)) return;
    setValues([...values, city]);
  };
  const addSelectedTimeZone = () => {
    if (!selectedTimeZone) return;
    const option = options.timeZoneOptions.find(({ value }) => value === selectedTimeZone);
    if (!option) return;
    const label = option.label.replace(` (${option.value})`, "");
    addCity({ id: createId(), label, timeZone: option.value });
    setSelectedTimeZone(null);
  };

  return (
    <Fieldset legend={t("label")}>
      <Stack gap="sm">
        {options.withDescription && (
          <Text size="sm" c="dimmed">
            {t("description")}
          </Text>
        )}

        <Group gap="xs" align="end" wrap="nowrap">
          <Select
            flex={1}
            label={tEditor("timezone")}
            placeholder={tEditor("searchPlaceholder")}
            searchable
            clearable
            data={availableOptions}
            value={selectedTimeZone}
            onChange={setSelectedTimeZone}
            disabled={isFull}
            nothingFoundMessage={tEditor("noResults")}
          />
          <Button
            leftSection={<IconPlus size="var(--mantine-font-size-md)" />}
            onClick={addSelectedTimeZone}
            disabled={isFull || selectedTimeZone === null}
          >
            {tEditor("add")}
          </Button>
        </Group>

        <Group gap="xs">
          {options.presets.map((preset) => (
            <Button
              key={preset.timeZone}
              size="compact-xs"
              variant="light"
              disabled={isFull || usedTimeZones.has(preset.timeZone)}
              onClick={() => addCity({ ...preset, id: createId() })}
            >
              {preset.label}
            </Button>
          ))}
        </Group>

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
              {values.map((city) => (
                <SortableTimezone
                  key={city.id}
                  kind={kind}
                  city={city}
                  timeZoneOptions={options.timeZoneOptions}
                  usedTimeZones={usedTimeZones}
                  onChange={(nextCity) =>
                    setValues(values.map((candidate) => (candidate.id === city.id ? nextCity : candidate)))
                  }
                  onRemove={() => setValues(values.filter((candidate) => candidate.id !== city.id))}
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

interface SortableTimezoneProps {
  kind: WidgetKind;
  city: OptionTimezone;
  timeZoneOptions: readonly { value: string; label: string }[];
  usedTimeZones: ReadonlySet<string>;
  onChange: (city: OptionTimezone) => void;
  onRemove: () => void;
}

const SortableTimezone = ({
  kind,
  city,
  timeZoneOptions,
  usedTimeZones,
  onChange,
  onRemove,
}: SortableTimezoneProps) => {
  const t = useTimezoneListTranslation(kind);
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: city.id,
  });
  const style = {
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };
  const hasCurrentTimeZone = timeZoneOptions.some(({ value }) => value === city.timeZone);
  const selectableTimeZones = hasCurrentTimeZone
    ? timeZoneOptions
    : [{ value: city.timeZone, label: t("unsupportedOption", { timeZone: city.timeZone }) }, ...timeZoneOptions];

  return (
    <Card ref={setNodeRef} withBorder p="xs" style={style}>
      <Group gap="xs" wrap="wrap" align="end">
        <ActionIcon
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          variant="subtle"
          color="gray"
          size="lg"
          aria-label={t("reorder", { city: city.label })}
          style={{ cursor: "grab" }}
        >
          <IconGripVertical size="var(--mantine-font-size-lg)" />
        </ActionIcon>
        <TextInput
          flex={1}
          label={t("cityLabel")}
          value={city.label}
          onChange={(event) => onChange({ ...city, label: event.currentTarget.value })}
        />
        <Select
          flex={2}
          label={t("timezone")}
          searchable
          data={selectableTimeZones.map((option) => ({
            ...option,
            disabled: option.value !== city.timeZone && usedTimeZones.has(option.value),
          }))}
          value={city.timeZone}
          onChange={(timeZone) => {
            if (timeZone) onChange({ ...city, timeZone });
          }}
        />
        <ActionIcon
          color="red"
          variant="subtle"
          size="lg"
          aria-label={t("remove", { city: city.label })}
          onClick={onRemove}
        >
          <IconTrash size="var(--mantine-font-size-lg)" />
        </ActionIcon>
      </Group>
    </Card>
  );
};

type TimezoneListTranslationKey =
  | "timezone"
  | "cityLabel"
  | "searchPlaceholder"
  | "noResults"
  | "unsupportedOption"
  | "add"
  | "remove"
  | "reorder"
  | "limit";

type TimezoneListTranslation = (key: TimezoneListTranslationKey, values?: Record<string, string | number>) => string;

const useTimezoneListTranslation = (kind: WidgetKind) =>
  useI18n(`widget.${kind}.timezoneList` as never) as unknown as TimezoneListTranslation;
