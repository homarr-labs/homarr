import { describe, expect, it } from "vitest";

import { objectEntries } from "@homarr/common";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { createLanguageMapping } from "@homarr/translation";

import { widgetImports } from "..";

interface TranslationOption {
  label?: string;
  description?: string;
}

interface TranslationWidget {
  option: Record<string, TranslationOption>;
}

const toTranslationWidgets = (input: unknown): Record<string, TranslationWidget> => {
  if (typeof input !== "object" || input === null) {
    throw new Error("Widget translations are invalid");
  }

  return input as Record<string, TranslationWidget>;
};

describe("Widget properties with description should have matching translations", async () => {
  const enTranslation = await createLanguageMapping().en();
  const widgetTranslations = toTranslationWidgets(enTranslation.default.widget as unknown);
  objectEntries(widgetImports).forEach(([key, value]) => {
    Object.entries(value.definition.createOptions({} as SettingsContextProps)).forEach(([optionKey, optionValue_]) => {
      const optionValue = optionValue_ as { withDescription: boolean };
      it(`should have matching translations for ${optionKey} option description of ${key} widget`, () => {
        const option = widgetTranslations[key].option;
        if (!(optionKey in option)) {
          throw new Error(`Option ${optionKey} not found in translation`);
        }
        const value = option[optionKey];

        expect("description" in value).toBe(optionValue.withDescription);
      });
    });
  });
});

describe("Widget properties should have matching name translations", async () => {
  const enTranslation = await createLanguageMapping().en();
  const widgetTranslations = toTranslationWidgets(enTranslation.default.widget as unknown);
  objectEntries(widgetImports).forEach(([key, value]) => {
    Object.keys(value.definition.createOptions({} as SettingsContextProps)).forEach((optionKey) => {
      it(`should have matching translations for ${optionKey} option name of ${key} widget`, () => {
        const option = widgetTranslations[key].option;
        if (!(optionKey in option)) {
          throw new Error(`Option ${optionKey} not found in translation`);
        }
        const value = option[optionKey];

        expect("label" in value).toBe(true);
      });
    });
  });
});
