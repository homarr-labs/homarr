import { objectEntries } from "@homarr/common";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";
import type { WidgetOptionDefinition, WidgetOptionType } from "@homarr/widgets";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";

export type Translator = {
  (key: string): string;
};

export interface HoverMetadataItem {
  label: string;
  value: string;
}

const maxMetadataItems = 3;

const skippedOptionTypes: Partial<Record<WidgetOptionType, true>> = {
  app: true,
  anchorNote: true,
  dynamicSelect: true,
  sortableItemList: true,
  multiReleasesRepositories: true,
  umamiEventName: true,
  umamiEventNames: true,
  umamiWebsite: true,
};

const isEqualValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

type OptionDefinitionWithRules = WidgetOptionDefinition & {
  shouldHide?: (options: never, integrationKinds: IntegrationKind[]) => boolean;
  options?: readonly { value: unknown; label: unknown }[];
};

type OptionFormatter = (value: unknown, definition: OptionDefinitionWithRules, t: Translator) => string | null;

const resolveSelectLabel = (value: unknown, definition: OptionDefinitionWithRules, t: Translator) => {
  const match = definition.options?.find((option) => option.value === value);
  const label = match?.label;
  const fallbackLabel = () => String(value);
  const labelResolvers: Record<string, () => string> = {
    function: () => (label as (translator: Translator) => string)(t),
    string: () => label as string,
    missing: fallbackLabel,
  };
  const labelType = typeof label;
  const resolveLabel: () => string = labelResolvers[labelType] ?? fallbackLabel;
  return resolveLabel();
};

const optionTypeFormatters: Partial<Record<WidgetOptionType, OptionFormatter>> = {
  switch: (value, _, t) => {
    const switchLabels: Record<string, string> = {
      true: t("common.action.show"),
      false: t("common.action.hide"),
    };
    return switchLabels[String(Boolean(value))] ?? null;
  },
  text: (value) => {
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  },
  number: (value) => String(value),
  slider: (value) => String(value),
  select: (value, definition, t) => resolveSelectLabel(value, definition, t),
  multiSelect: (value) => {
    const items = value as unknown[];
    return items.length > 0 ? String(items.length) : null;
  },
  multiText: (value) => {
    const items = (value as string[]).filter((entry) => entry.trim().length > 0);
    return items.length > 0 ? items.join(", ") : null;
  },
  location: (value) => {
    const location = value as { name?: string };
    const name = location.name?.trim() ?? "";
    return name.length > 0 ? name : null;
  },
};

const formatOptionValue = (
  type: WidgetOptionType,
  value: unknown,
  definition: OptionDefinitionWithRules,
  t: Translator,
) => {
  const formatter = optionTypeFormatters[type];
  return formatter?.(value, definition, t) ?? null;
};

const getOptionLabel = (kind: WidgetKind, key: string, t: Translator) => {
  const labelKey = `widget.${kind}.option.${key}.label`;
  const translated = t(labelKey);
  return translated === labelKey ? key : translated;
};

export const collectWidgetHoverMetadata = (
  item: SectionItem,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  integrationKinds: IntegrationKind[],
  t: Translator,
): HoverMetadataItem[] => {
  const { definition } = widgetImports[item.kind];
  const optionDefinitions = definition.createOptions(settings) as Record<string, OptionDefinitionWithRules>;
  const resolvedOptions = reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options);

  return objectEntries(optionDefinitions)
    .filter(([key, optionDefinition]) => {
      const skip = skippedOptionTypes[optionDefinition.type];
      const hidden = optionDefinition.shouldHide?.(resolvedOptions as never, integrationKinds);
      const unchanged = isEqualValue(resolvedOptions[key], optionDefinition.defaultValue);
      return !skip && !hidden && !unchanged;
    })
    .map(([key, optionDefinition]) => {
      const formattedValue = formatOptionValue(optionDefinition.type, resolvedOptions[key], optionDefinition, t);
      return {
        label: getOptionLabel(item.kind, key, t),
        value: formattedValue ?? "",
      };
    })
    .filter((entry) => entry.value.length > 0)
    .slice(0, maxMetadataItems);
};

interface DisplayNameSource {
  matches: (item: SectionItem, options: Record<string, unknown>) => boolean;
  resolve: (item: SectionItem, options: Record<string, unknown>) => string;
}

const displayNameSources: DisplayNameSource[] = [
  {
    matches: (item) => Boolean(item.advancedOptions.title?.trim()),
    resolve: (item) => item.advancedOptions.title?.trim() ?? "",
  },
  {
    matches: (item, options) =>
      item.kind === "clock" &&
      Boolean(options.customTitleToggle) &&
      String(options.customTitle ?? "").trim().length > 0,
    resolve: (_, options) => String(options.customTitle).trim(),
  },
];

export const resolveWidgetDisplayName = (
  item: SectionItem,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  t: Translator,
) => {
  const resolvedOptions = reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options);
  const source = displayNameSources.find((entry) => entry.matches(item, resolvedOptions));
  return source?.resolve(item, resolvedOptions) ?? t(`widget.${item.kind}.name`);
};
