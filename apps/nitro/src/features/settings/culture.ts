import { createCultureFormatter } from "../../../../../packages/translation/src/runtime/culture";
import type { CultureClock, CulturePreferences } from "../../../../../packages/translation/src/runtime/culture";
import type { RequestCulture } from "../../../../../packages/translation/src/runtime/resources";
import { localeConfigurations } from "../../../../../packages/translation/src/config";
import { supportedLanguages } from "../../../../../packages/translation/src/languages";

export const settingsLanguageOptions = Object.freeze(
  supportedLanguages.map((value) =>
    Object.freeze({
      value,
      label: `${localeConfigurations[value].name} (${localeConfigurations[value].translatedName})`,
    }),
  ),
);

export function createSettingsFormatting(
  culture: RequestCulture,
  preferences: CulturePreferences,
  clock: CultureClock,
) {
  const formatter = createCultureFormatter(culture, preferences, clock);
  const instant = formatter.dayjs(clock.now(), culture.i18n.snapshot.timeZone);
  return Object.freeze({
    formatter,
    catalogLocale: culture.resolved.catalogLocale,
    intlLocale: culture.resolved.intlLocale,
    timeZone: culture.i18n.snapshot.timeZone,
    weekdays: Object.freeze([0, 1, 2, 3, 4, 5, 6].map((day) => instant.day(day).format("dddd"))),
  });
}

export type SettingsFormatting = ReturnType<typeof createSettingsFormatting>;
