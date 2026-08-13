import { describe, expect, it } from "vitest";

import type { SettingsContextProps } from "@homarr/settings/creator";
import { createLanguageMapping } from "@homarr/translation";

import { loadAllWidgetDefinitions } from "../manifest";

const doesOptionRenderTranslatedCopy = (option: unknown) => {
  if (typeof option !== "object" || option === null || !("type" in option)) return false;
  return option.type !== "internal" && option.type !== "customWidgetConfiguration";
};

const widgetDefinitions = await loadAllWidgetDefinitions();
const enTranslation = await createLanguageMapping().en();

describe("Widget properties with description should have matching translations", () => {
  for (const [key, definition] of widgetDefinitions) {
    Object.entries(definition.createOptions({} as SettingsContextProps))
      .filter(([, option]) => doesOptionRenderTranslatedCopy(option))
      .forEach(([optionKey, optionValue_]) => {
        const optionValue = optionValue_ as { withDescription: boolean };
        it(`should have matching translations for ${optionKey} option description of ${key} widget`, () => {
          const option = enTranslation.default.widget[key].option;
          if (!(optionKey in option)) {
            throw new Error(`Option ${optionKey} not found in translation`);
          }
          const value = option[optionKey as keyof typeof option];

          expect("description" in value).toBe(optionValue.withDescription);
        });
      });
  }
});

describe("Widget properties should have matching name translations", () => {
  for (const [key, definition] of widgetDefinitions) {
    Object.entries(definition.createOptions({} as SettingsContextProps))
      .filter(([, option]) => doesOptionRenderTranslatedCopy(option))
      .forEach(([optionKey]) => {
        it(`should have matching translations for ${optionKey} option name of ${key} widget`, () => {
          const option = enTranslation.default.widget[key].option;
          if (!(optionKey in option)) {
            throw new Error(`Option ${optionKey} not found in translation`);
          }
          const value = option[optionKey as keyof typeof option];

          expect("label" in value).toBe(true);
        });
      });
  }
});
