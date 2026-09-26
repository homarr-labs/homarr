import { describe, expect, it } from "vitest";

import type { WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { createLanguageMapping } from "@homarr/translation";

import { loadAllWidgetDefinitions } from "../manifest";
import { getWidgetOptionTranslationNamespace } from "../option-translation";

const doesOptionRenderTranslatedCopy = (option: unknown) => {
  if (typeof option !== "object" || option === null || !("type" in option)) return false;
  return option.type !== "internal" && option.type !== "customWidgetConfiguration";
};

const widgetDefinitions = await loadAllWidgetDefinitions();
const enTranslation = await createLanguageMapping().en();

const getTranslationAtPath = (path: string) => {
  let value: unknown = enTranslation.default;

  for (const segment of path.split(".")) {
    if (typeof value !== "object" || value === null || !(segment in value)) return undefined;
    value = value[segment as keyof typeof value];
  }

  return value;
};

const getOptionTranslation = (kind: WidgetKind, property: string) => {
  return getTranslationAtPath(getWidgetOptionTranslationNamespace(kind, property));
};

describe("Widget properties should have matching name translations", () => {
  for (const [key, definition] of widgetDefinitions) {
    Object.entries(definition.createOptions({} as SettingsContextProps))
      .filter(([, option]) => doesOptionRenderTranslatedCopy(option))
      .forEach(([optionKey]) => {
        it(`should have matching translations for ${optionKey} option name of ${key} widget`, () => {
          const value = getOptionTranslation(key, optionKey);
          if (typeof value !== "object" || value === null) {
            throw new Error(`Option ${optionKey} not found in translation`);
          }

          expect("label" in value).toBe(true);
        });
      });
  }
});
