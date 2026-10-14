"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ActionIcon, Button, Card, Fieldset, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";

import { createId } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { OptionTimezone } from "../options";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { CapturedStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputOwner } from "./static-owner";

const isTimezoneList = (value: unknown): value is OptionTimezone[] =>
  Array.isArray(value) &&
  value.every(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      typeof entry.id === "string" &&
      "label" in entry &&
      typeof entry.label === "string" &&
      "timeZone" in entry &&
      typeof entry.timeZone === "string",
  );

export const WidgetTimezoneListInput = ({ property, kind, options }: CommonWidgetInputProps<"timezoneList">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tEditor = useTimezoneListTranslation(kind);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const fieldPath = `options.${property}`;
  const currentValue = form.values.options[property];
  const values = isTimezoneList(currentValue) ? currentValue : options.defaultValue;
  const [selection, setSelection] = useState<{
    owner: CapturedStaticWidgetInputOwner;
    value: string | null;
  } | null>(null);
  const selectedTimeZone = selection?.value ?? null;
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

  const usedTimeZones = useMemo(() => new Set(values.map(({ timeZone }) => timeZone)), [values]);
  const availableOptions = options.timeZoneOptions.map((option) => ({
    ...option,
    disabled: usedTimeZones.has(option.value),
  }));
  const isFull = values.length >= options.maxValues;

  const setValues = (
    origin: CapturedStaticWidgetInputOwner,
    update: (current: OptionTimezone[]) => OptionTimezone[],
  ) => {
    if (!origin.isCurrent()) return false;
    const current = form.getValues().options[property];
    const currentValues = isTimezoneList(current) ? current : options.defaultValue;
    const nextValues = update(currentValues);
    if (nextValues === currentValues || !origin.isCurrent()) return false;
    form.setFieldValue(fieldPath, nextValues);
    return origin.isCurrent();
  };
  const addCity = (origin: CapturedStaticWidgetInputOwner, city: OptionTimezone) => {
    if (!origin.isCurrent()) return false;
    return setValues(origin, (current) => {
      if (current.length >= options.maxValues || current.some(({ timeZone }) => timeZone === city.timeZone)) {
        return current;
      }
      return [...current, city];
    });
  };
  const addSelectedTimeZone = () => {
    if (!owner.isCurrent()) return;
    if (!selection?.value || !selection.owner.isCurrent()) return;
    const origin = selection.owner;
    const option = options.timeZoneOptions.find(({ value }) => value === selection.value);
    if (!option) return;
    const label = option.label.replace(` (${option.value})`, "");
    if (!origin.isCurrent()) return;
    if (!addCity(origin, { id: createId(), label, timeZone: option.value })) return;
    if (!origin.isCurrent()) return;
    setSelection({ owner: origin, value: null });
  };
  let pendingLabel = "";
  if (selection?.owner.isCurrent()) {
    pendingLabel = options.timeZoneOptions.find(({ value }) => value === selectedTimeZone)?.label ?? "";
  }
  const pendingSelect = useTimezoneSelect(
    owner,
    pendingLabel,
    (origin, value) => {
      if (!origin.isCurrent()) return;
      setSelection({ owner: origin, value });
    },
    (origin) => {
      if (!origin.isCurrent()) return "";
      if (selection && !selection.owner.isCurrent()) {
        if (!origin.isCurrent()) return "";
        setSelection(null);
        return "";
      }
      return options.timeZoneOptions.find(({ value }) => value === selectedTimeZone)?.label ?? "";
    },
  );

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
            {...pendingSelect}
            flex={1}
            label={tEditor("timezone")}
            placeholder={tEditor("searchPlaceholder")}
            searchable
            clearable
            data={availableOptions}
            value={selectedTimeZone}
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
              onClick={() => {
                if (!owner.isCurrent()) return;
                addCity(owner, { ...preset, id: createId() });
              }}
            >
              {preset.label}
            </Button>
          ))}
        </Group>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            if (!owner.isCurrent()) return;
            if (drag.current) return;
            const activeId = active.id;
            const current = form.getValues().options[property];
            const currentValues = isTimezoneList(current) ? current : options.defaultValue;
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
              {values.map((city) => (
                <SortableTimezone
                  key={city.id}
                  kind={kind}
                  city={city}
                  owner={owner}
                  timeZoneOptions={options.timeZoneOptions}
                  usedTimeZones={usedTimeZones}
                  onChange={(origin, update) => {
                    if (!origin.isCurrent()) return;
                    setValues(origin, (current) => {
                      const currentCity = current.find(({ id }) => id === city.id);
                      if (!currentCity) return current;
                      const nextCity = update(currentCity);
                      if (
                        current.some(
                          (candidate) => candidate.id !== city.id && candidate.timeZone === nextCity.timeZone,
                        )
                      ) {
                        return current;
                      }
                      return current.map((candidate) => {
                        if (candidate.id === city.id) return nextCity;
                        return candidate;
                      });
                    });
                  }}
                  onRemove={(origin) => {
                    if (!origin.isCurrent()) return;
                    setValues(origin, (current) => {
                      if (!current.some(({ id }) => id === city.id)) return current;
                      return current.filter((candidate) => candidate.id !== city.id);
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

interface SortableTimezoneProps {
  kind: WidgetKind;
  city: OptionTimezone;
  timeZoneOptions: readonly { value: string; label: string }[];
  usedTimeZones: ReadonlySet<string>;
  owner: CapturedStaticWidgetInputOwner;
  onChange: (origin: CapturedStaticWidgetInputOwner, update: (current: OptionTimezone) => OptionTimezone) => void;
  onRemove: (origin: CapturedStaticWidgetInputOwner) => void;
}

const SortableTimezone = ({
  kind,
  city,
  timeZoneOptions,
  usedTimeZones,
  owner,
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
  const timezoneSelect = useTimezoneSelect(
    owner,
    selectableTimeZones.find(({ value }) => value === city.timeZone)?.label ?? "",
    (origin, timeZone) => {
      if (!timeZone || !origin.isCurrent()) return;
      onChange(origin, (current) => ({ ...current, timeZone }));
    },
    () => selectableTimeZones.find(({ value }) => value === city.timeZone)?.label ?? "",
  );

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
          onChange={(event) => {
            if (!owner.isCurrent()) return;
            const label = event.currentTarget.value;
            if (!owner.isCurrent()) return;
            onChange(owner, (current) => ({ ...current, label }));
          }}
        />
        <Select
          {...timezoneSelect}
          flex={2}
          label={t("timezone")}
          searchable
          data={selectableTimeZones.map((option) => ({
            ...option,
            disabled: option.value !== city.timeZone && usedTimeZones.has(option.value),
          }))}
          value={city.timeZone}
        />
        <ActionIcon
          color="red"
          variant="subtle"
          size="lg"
          aria-label={t("remove", { city: city.label })}
          onClick={() => {
            if (!owner.isCurrent()) return;
            onRemove(owner);
          }}
        >
          <IconTrash size="var(--mantine-font-size-lg)" />
        </ActionIcon>
      </Group>
    </Card>
  );
};

const useTimezoneSelect = (
  owner: CapturedStaticWidgetInputOwner,
  label: string,
  onChange: (origin: CapturedStaticWidgetInputOwner, value: string | null) => void,
  startSearch: (origin: CapturedStaticWidgetInputOwner) => string,
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
    const nextSearch = startSearch(owner);
    if (!owner.isCurrent()) return;
    operation.current = { owner, active: true, onChange };
    if (!owner.isCurrent()) return;
    setSearch({ owner, value: nextSearch });
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
    clearButtonProps: { onClickCapture: begin },
    onDropdownOpen: () => {
      if (!owner.isCurrent()) return;
      if (!operation.current) begin();
      const retained = operation.current;
      if (!retained?.active || !retained.owner.isCurrent()) return;
      setOpened(true);
    },
    onDropdownClose: close,
    onBlur: close,
    onSearchChange: (value: string) => {
      if (!owner.isCurrent()) return;
      const retained = operation.current;
      if (!retained?.active || !retained.owner.isCurrent()) return;
      setSearch({ owner: retained.owner, value });
    },
    onChange: (value: string | null) => {
      if (!owner.isCurrent()) return;
      const retained = operation.current;
      if (retained) {
        if (!retained.active || !retained.owner.isCurrent()) return;
        retained.onChange(retained.owner, value);
        return;
      }
      if (!owner.isCurrent()) return;
      onChange(owner, value);
    },
  };
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
