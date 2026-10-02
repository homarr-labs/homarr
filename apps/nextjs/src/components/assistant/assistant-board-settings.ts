import type { AssistantBoardSettingsChanges, ConfigureBoardSettingsResult } from "./assistant-tool-contracts";

export const assistantBoardSettingKeys = [
  "pageTitle",
  "metaTitle",
  "logoImageUrl",
  "faviconImageUrl",
  "backgroundImageUrl",
  "backgroundImageAttachment",
  "backgroundImageRepeat",
  "backgroundImageSize",
  "primaryColor",
  "secondaryColor",
  "opacity",
  "customCss",
  "iconColor",
  "itemRadius",
  "disableStatus",
] as const satisfies readonly (keyof AssistantBoardSettingsChanges)[];

const comparableValue = (value: unknown) => (value === null ? "" : value);

export const getChangedBoardSettings = (current: AssistantBoardSettingsChanges, next: AssistantBoardSettingsChanges) =>
  Object.fromEntries(
    assistantBoardSettingKeys.flatMap((key) =>
      comparableValue(current[key]) === comparableValue(next[key]) ? [] : [[key, next[key]]],
    ),
  ) as AssistantBoardSettingsChanges;

export const getAssistantBoardSettingsResult = (
  id: string,
  current: AssistantBoardSettingsChanges,
  next: AssistantBoardSettingsChanges,
): ConfigureBoardSettingsResult => {
  const changes = getChangedBoardSettings(current, next);
  return Object.keys(changes).length === 0 ? { id, cancelled: true } : { id, ...changes };
};

export const getCustomCssWarnings = (css: string) => ({
  importsStylesheet: /@import\b/iu.test(css),
  loadsRemoteResource: /url\(\s*["']?https?:\/\//iu.test(css),
});

const appearanceKeys = new Set<keyof AssistantBoardSettingsChanges>([
  "primaryColor",
  "secondaryColor",
  "opacity",
  "iconColor",
  "itemRadius",
]);
const backgroundKeys = new Set<keyof AssistantBoardSettingsChanges>([
  "backgroundImageUrl",
  "backgroundImageAttachment",
  "backgroundImageRepeat",
  "backgroundImageSize",
]);

export const getAssistantBoardSettingsDefaultTab = (
  changes: AssistantBoardSettingsChanges,
): "general" | "appearance" | "background" | "css" => {
  if (changes.customCss !== undefined) return "css";
  const keys = Object.keys(changes) as (keyof AssistantBoardSettingsChanges)[];
  if (keys.some((key) => appearanceKeys.has(key))) return "appearance";
  if (keys.some((key) => backgroundKeys.has(key))) return "background";
  return "general";
};
