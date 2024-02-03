import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import type { z } from "@homarr/validation";

import { widgetImports } from ".";

interface CommonInput<TType> {
  defaultValue?: TType;
  withDescription?: boolean;
}

interface TextInput extends CommonInput<string> {
  validate: z.ZodType<string>;
}

interface MultiSelectInput<TOptions extends string[]>
  extends CommonInput<TOptions[number][]> {
  options: TOptions;
}

interface SelectInput<TOptions extends readonly [string, ...string[]]>
  extends CommonInput<TOptions[number]> {
  options: TOptions;
}

interface NumberInput extends CommonInput<number | ""> {
  validate: z.ZodNumber;
  step?: number;
}

interface SliderInput extends CommonInput<number> {
  validate: z.ZodNumber;
  step?: number;
}

interface OptLocation {
  name: string;
  latitude: number;
  longitude: number;
}

const optionsFactory = {
  switch: (input?: CommonInput<boolean>) => ({
    type: "switch" as const,
    defaultValue: input?.defaultValue ?? false,
    withDescription: input?.withDescription ?? false,
  }),
  text: (input?: TextInput) => ({
    type: "text" as const,
    defaultValue: input?.defaultValue ?? "",
    withDescription: input?.withDescription ?? false,
    validate: input?.validate,
  }),
  multiSelect: <TOptions extends string[]>(
    input: MultiSelectInput<TOptions>,
  ) => ({
    type: "multiSelect" as const,
    defaultValue: input.defaultValue ?? [],
    options: input.options,
    withDescription: input.withDescription ?? false,
  }),
  select: <TOptions extends readonly [string, ...string[]]>(
    input: SelectInput<TOptions>,
  ) => ({
    type: "select" as const,
    defaultValue: input.defaultValue ?? input.options[0],
    options: input.options,
    withDescription: input.withDescription ?? false,
  }),
  number: (input: NumberInput) => ({
    type: "number" as const,
    defaultValue: input.defaultValue ?? ("" as const),
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
  location: (input?: CommonInput<OptLocation>) => ({
    type: "location" as const,
    defaultValue: input?.defaultValue ?? {
      name: "",
      latitude: 0,
      longitude: 0,
    },
    withDescription: input?.withDescription ?? false,
  }),
  multiText: (input?: CommonInput<string[]>) => ({
    type: "multiText" as const,
    defaultValue: input?.defaultValue ?? [],
    withDescription: input?.withDescription ?? false,
  }),
};

type WidgetOptionFactory = typeof optionsFactory;
export type WidgetOptionDefinition = ReturnType<
  WidgetOptionFactory[keyof WidgetOptionFactory]
>;
export type WidgetOptionsRecord = Record<string, WidgetOptionDefinition>;
export type WidgetOptionType = WidgetOptionDefinition["type"];
export type WidgetOptionOfType<TType extends WidgetOptionType> = Extract<
  WidgetOptionDefinition,
  { type: TType }
>;

type inferOptionFromDefinition<TDefinition extends WidgetOptionDefinition> =
  TDefinition["defaultValue"];
export type inferOptionsFromDefinition<TOptions extends WidgetOptionsRecord> = {
  [key in keyof TOptions]: inferOptionFromDefinition<TOptions[key]>;
};

interface FieldConfiguration<TOptions extends WidgetOptionsRecord> {
  shouldHide: (options: inferOptionsFromDefinition<TOptions>) => boolean;
}

type ConfigurationInput<TOptions extends WidgetOptionsRecord> = Partial<
  Record<keyof TOptions, FieldConfiguration<TOptions>>
>;

const createOptions = <TOptions extends WidgetOptionsRecord>(
  optionsCallback: (factory: WidgetOptionFactory) => TOptions,
  configuration?: ConfigurationInput<TOptions>,
) => {
  const obj = {} as Record<keyof TOptions, unknown>;
  const options = optionsCallback(optionsFactory);

  for (const key in options) {
    obj[key] = {
      ...configuration?.[key],
      ...options[key],
    };
  }

  return obj as {
    [key in keyof TOptions]: TOptions[key] & FieldConfiguration<TOptions>;
  };
};

export const opt = {
  from: createOptions,
};

export const reduceWidgetOptionsWithDefaultValues = (
  kind: WidgetKind,
  currentValue: Record<string, unknown> = {},
) => {
  const definition = widgetImports[kind].definition;
  const options = definition.options as Record<string, WidgetOptionDefinition>;
  return objectEntries(options).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: currentValue[key] ?? value.defaultValue,
    }),
    {} as Record<string, unknown>,
  );
};
