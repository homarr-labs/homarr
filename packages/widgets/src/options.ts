import type React from "react";
import type { DraggableAttributes, UniqueIdentifier } from "@dnd-kit/core";
import { z } from "zod/v4";
import type { RefinementCtx, ZodType } from "zod/v4";

import type { IntegrationKind } from "@homarr/definitions";

import type { DynamicSelectOption } from "./_inputs/widget-dynamic-select-input";
import type { inferSelectOptionValue, SelectOption } from "./_inputs/widget-select-input";
import type { ReleasesRepository } from "./releases/releases-repository";

interface CommonInput<TType> {
  defaultValue?: TType;
  withDescription?: boolean;
  skipContextMenu?: boolean;
}

interface TextInput extends CommonInput<string> {
  validate?: z.ZodType<string>;
}

type AnchorNoteInput = CommonInput<string>;

interface MultiSelectInput<TOptions extends SelectOption[]> extends CommonInput<
  inferSelectOptionValue<TOptions[number]>[]
> {
  options: TOptions;
  searchable?: boolean;
}

export interface SortableItemListInput<TItem, TOptionValue extends UniqueIdentifier> extends Omit<
  CommonInput<TOptionValue[]>,
  "withDescription"
> {
  AddButton: (props: {
    addItem: (item: TItem) => void;
    migrateItems: (items: TItem[], optionsPatch: Record<string, unknown>) => void;
    removeItem: (value: TOptionValue) => void;
    values: TOptionValue[];
    initialOptions: Record<string, unknown>;
  }) => React.ReactNode;
  ItemComponent: (props: {
    item: TItem;
    removeItem: () => void;
    removeLabel: string;
    rootAttributes: DraggableAttributes;
    handle: React.ReactNode;
  }) => React.ReactNode;
  uniqueIdentifier: (item: TItem) => TOptionValue;
  useData: (values: TOptionValue[]) => { data: TItem[] | undefined; isLoading: boolean; error: unknown };
}

interface SelectInput<TOptions extends readonly SelectOption[]> extends CommonInput<
  inferSelectOptionValue<TOptions[number]>
> {
  options: TOptions;
  searchable?: boolean;
  withPlaceholder?: boolean;
}

interface DynamicSelectInput extends CommonInput<DynamicSelectOption | null> {
  useOptions: (
    query: string,
    integrationIds: string[],
    options: Record<string, unknown>,
    itemId?: string,
    boardId?: string,
  ) => {
    error?: string;
    isPending: boolean;
    isError?: boolean;
    options: DynamicSelectOption[];
  };
}

interface DynamicMultiSelectInput extends CommonInput<string[]> {
  maxValues?: number;
  useOptions: () => {
    data: DynamicSelectOption[];
    isPending: boolean;
    isError: boolean;
  };
}

interface IntegrationSelectInput extends CommonInput<string> {
  clearable?: boolean;
  searchable?: boolean;
  useOptions: (integrationIds: string[]) => {
    data: { value: string; label: string }[];
    isPending: boolean;
    isError: boolean;
  };
}

interface IntegrationMultiSelectInput extends CommonInput<string[]> {
  withDescription?: boolean;
  useOptions: (integrationIds: string[]) => {
    data: { value: string; label: string }[];
    isPending: boolean;
    isError: boolean;
  };
}

interface NumberInput extends CommonInput<number> {
  validate: z.ZodNumber;
  step?: number;
}

interface SliderInput extends CommonInput<number> {
  validate: z.ZodNumber;
  step?: number;
}

export interface OptionTimezone {
  id: string;
  label: string;
  timeZone: string;
}

interface TimezoneListInput extends CommonInput<OptionTimezone[]> {
  maxValues?: number;
  presets?: readonly OptionTimezone[];
  timeZoneOptions: readonly { value: string; label: string }[];
}

export type DateTimeEventRecurrence = "none" | "yearly";

export interface OptionDateTimeEvent {
  id: string;
  label: string;
  targetUtc: string;
  timeZone: string;
  startUtc?: string;
  recurrence: DateTimeEventRecurrence;
}

interface DateTimeEventListInput extends CommonInput<OptionDateTimeEvent[]> {
  maxValues?: number;
  timeZoneOptions: readonly { value: string; label: string }[];
}

export interface OptionLocation {
  name: string;
  latitude: number;
  longitude: number;
}

const optionsFactory = {
  internal: <T>(input: CommonInput<T> & { defaultValue: T }) => ({
    type: "internal" as const,
    defaultValue: input.defaultValue,
    withDescription: false,
    skipContextMenu: true,
  }),
  switch: (input?: CommonInput<boolean>) => ({
    type: "switch" as const,
    defaultValue: input?.defaultValue ?? false,
    withDescription: input?.withDescription ?? false,
    skipContextMenu: input?.skipContextMenu ?? false,
  }),
  text: (input?: TextInput) => ({
    type: "text" as const,
    defaultValue: input?.defaultValue ?? "",
    withDescription: input?.withDescription ?? false,
    validate: input?.validate,
  }),
  anchorNote: (input?: AnchorNoteInput) => ({
    type: "anchorNote" as const,
    defaultValue: input?.defaultValue ?? "",
    withDescription: input?.withDescription ?? false,
  }),
  multiSelect: <const TOptions extends SelectOption[]>(input: MultiSelectInput<TOptions>) => ({
    type: "multiSelect" as const,
    defaultValue: input.defaultValue ?? [],
    options: input.options,
    searchable: input.searchable ?? false,
    withDescription: input.withDescription ?? false,
  }),
  dynamicSelect: (input: DynamicSelectInput) => ({
    type: "dynamicSelect" as const,
    defaultValue: input.defaultValue ?? null,
    useOptions: input.useOptions,
    withDescription: input.withDescription ?? false,
  }),
  dynamicMultiSelect: (input: DynamicMultiSelectInput) => ({
    type: "dynamicMultiSelect" as const,
    defaultValue: input.defaultValue ?? [],
    maxValues: input.maxValues,
    useOptions: input.useOptions,
    withDescription: input.withDescription ?? false,
  }),
  select: <const TOptions extends SelectOption[]>(input: SelectInput<TOptions>) => ({
    type: "select" as const,
    defaultValue: (input.defaultValue ?? input.options[0]) as inferSelectOptionValue<TOptions[number]>,
    options: input.options,
    searchable: input.searchable ?? false,
    withDescription: input.withDescription ?? false,
    withPlaceholder: input.withPlaceholder ?? false,
  }),
  number: (input: NumberInput) => ({
    type: "number" as const,
    defaultValue: input.defaultValue ?? 0,
    step: input.step,
    withDescription: input.withDescription ?? false,
    validate: input.validate,
  }),
  slider: (input: SliderInput) => ({
    type: "slider" as const,
    defaultValue: input.defaultValue ?? input.validate.minValue ?? 0,
    step: input.step,
    withDescription: input.withDescription ?? false,
    validate: input.validate,
  }),
  location: (input?: CommonInput<OptionLocation>) => ({
    type: "location" as const,
    defaultValue: input?.defaultValue ?? {
      name: "",
      latitude: 0,
      longitude: 0,
    },
    withDescription: input?.withDescription ?? false,
    validate: z.object({
      name: z.string().min(1),
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
  timezoneList: (input: TimezoneListInput) => {
    const maxValues = input.maxValues ?? 6;
    return {
      type: "timezoneList" as const,
      defaultValue: input.defaultValue ?? [],
      maxValues,
      presets: input.presets ?? [],
      timeZoneOptions: input.timeZoneOptions,
      withDescription: input.withDescription ?? false,
      validate: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.string().trim().min(1).max(64),
            timeZone: z.string().min(1),
          }),
        )
        .max(maxValues)
        .superRefine((values, ctx) => {
          const ids = new Set<string>();
          const timeZones = new Set<string>();

          values.forEach((value, index) => {
            if (ids.has(value.id)) {
              ctx.addIssue({ code: "custom", path: [index, "id"], message: "Duplicate identifier" });
            }
            if (timeZones.has(value.timeZone)) {
              ctx.addIssue({ code: "custom", path: [index, "timeZone"], message: "Duplicate timezone" });
            }
            ids.add(value.id);
            timeZones.add(value.timeZone);
          });
        }),
    };
  },
  dateTimeEventList: (input: DateTimeEventListInput) => {
    const maxValues = input.maxValues ?? 20;
    const dateTimeEventSchema = z.object({
      id: z.string().min(1),
      label: z.string().trim().min(1).max(64),
      targetUtc: z.iso.datetime(),
      timeZone: z.string().min(1),
      startUtc: z.iso.datetime().optional(),
      recurrence: z.enum(["none", "yearly"]),
    });

    return {
      type: "dateTimeEventList" as const,
      defaultValue: input.defaultValue ?? [],
      maxValues,
      timeZoneOptions: input.timeZoneOptions,
      withDescription: input.withDescription ?? false,
      validate: z
        .array(dateTimeEventSchema)
        .max(maxValues)
        .superRefine((values, ctx) => {
          const ids = new Set<string>();
          values.forEach((value, index) => {
            if (ids.has(value.id)) {
              ctx.addIssue({ code: "custom", path: [index, "id"], message: "Duplicate identifier" });
            }
            ids.add(value.id);
          });
        }),
    };
  },
  multiText: (input?: CommonInput<string[]> & { validate?: ZodType }) => ({
    type: "multiText" as const,
    defaultValue: input?.defaultValue ?? [],
    withDescription: input?.withDescription ?? false,
    values: [] as string[],
    validate: input?.validate,
  }),
  multiReleasesRepositories: (input?: CommonInput<ReleasesRepository[]> & { validate?: ZodType }) => ({
    type: "multiReleasesRepositories" as const,
    defaultValue: input?.defaultValue ?? [],
    withDescription: input?.withDescription ?? false,
    values: [] as ReleasesRepository[],
    validate: input?.validate,
  }),
  app: () => ({
    type: "app" as const,
    defaultValue: "",
    withDescription: false,
  }),
  umamiEventName: () => ({
    type: "umamiEventName" as const,
    defaultValue: "",
    withDescription: true,
  }),
  umamiEventNames: () => ({
    type: "umamiEventNames" as const,
    defaultValue: [] as string[],
    withDescription: true,
  }),
  umamiWebsite: () => ({
    type: "umamiWebsite" as const,
    defaultValue: "",
    withDescription: true,
  }),
  integrationSelect: (input: IntegrationSelectInput) => ({
    type: "integrationSelect" as const,
    defaultValue: input.defaultValue ?? "",
    withDescription: input.withDescription ?? false,
    clearable: input.clearable ?? false,
    searchable: input.searchable ?? true,
    useOptions: input.useOptions,
  }),
  integrationMultiSelect: (input: IntegrationMultiSelectInput) => ({
    type: "integrationMultiSelect" as const,
    defaultValue: input.defaultValue ?? [],
    withDescription: input.withDescription ?? false,
    useOptions: input.useOptions,
  }),
  customWidgetSelect: (input?: CommonInput<string>) => ({
    type: "customWidgetSelect" as const,
    defaultValue: input?.defaultValue ?? "",
    withDescription: input?.withDescription ?? false,
  }),
  customWidgetConfiguration: (input?: CommonInput<Record<string, unknown>>) => ({
    type: "customWidgetConfiguration" as const,
    defaultValue: input?.defaultValue ?? {},
    withDescription: input?.withDescription ?? false,
    skipContextMenu: true,
  }),
  sortableItemList: <const TItem, const TOptionValue extends UniqueIdentifier>(
    input: SortableItemListInput<TItem, TOptionValue>,
  ) => ({
    type: "sortableItemList" as const,
    defaultValue: [] as TOptionValue[],
    itemComponent: input.ItemComponent,
    addButton: input.AddButton,
    uniqueIdentifier: input.uniqueIdentifier,
    useData: input.useData,
    withDescription: false,
  }),
};

type WidgetOptionFactory = typeof optionsFactory;

export type WidgetOptionDefinition =
  | ReturnType<WidgetOptionFactory[Exclude<keyof WidgetOptionFactory, "sortableItemList">]>
  // We allow any here as it's already type guarded with Record<string, unknown> and it still infers the correct type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ReturnType<typeof optionsFactory.sortableItemList<any, any>>;
export type WidgetOptionsRecord = Record<string, WidgetOptionDefinition>;
export type WidgetOptionType = WidgetOptionDefinition["type"];
export type WidgetOptionOfType<TType extends WidgetOptionType> = Extract<WidgetOptionDefinition, { type: TType }>;

type inferOptionFromDefinition<TDefinition extends WidgetOptionDefinition> = TDefinition["defaultValue"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type inferOptionsFromCreator<TOptions extends (settings: any) => WidgetOptionsRecord> =
  inferOptionsFromDefinition<ReturnType<TOptions>>;
export type inferOptionsFromDefinition<TOptions extends WidgetOptionsRecord> = {
  [key in keyof TOptions]: inferOptionFromDefinition<TOptions[key]>;
};

interface FieldConfiguration<TOptions extends WidgetOptionsRecord> {
  shouldHide: (options: inferOptionsFromDefinition<TOptions>, integrationKinds: IntegrationKind[]) => boolean;
}

type ConfigurationInput<TOptions extends WidgetOptionsRecord> = Partial<
  Record<keyof TOptions, FieldConfiguration<TOptions>>
>;

export const OPTIONS_SUPER_REFINE = Symbol("optionsSuperRefine");

const createOptions = <TOptions extends WidgetOptionsRecord>(
  optionsCallback: (factory: WidgetOptionFactory) => TOptions,
  configuration?: ConfigurationInput<TOptions>,
  optionsSuperRefine?: (data: inferOptionsFromDefinition<TOptions>, ctx: RefinementCtx) => void,
) => {
  const obj = {} as Record<keyof TOptions, unknown>;
  const options = optionsCallback(optionsFactory);

  for (const key in options) {
    obj[key] = {
      ...configuration?.[key],
      ...options[key],
    };
  }

  const result = obj as {
    [key in keyof TOptions]: TOptions[key] & FieldConfiguration<TOptions>;
  };

  if (optionsSuperRefine) {
    Object.defineProperty(result, OPTIONS_SUPER_REFINE, {
      value: optionsSuperRefine,
      enumerable: false,
    });
  }

  return result;
};

type OptionsBuilder = typeof createOptions;
export type OptionsBuilderResult = ReturnType<OptionsBuilder>;

export const optionsBuilder = {
  from: createOptions,
};
