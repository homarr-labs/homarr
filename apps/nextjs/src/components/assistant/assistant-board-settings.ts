import type { AssistantBoardSettingsChanges } from "./assistant-tool-contracts";

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

export const getCustomCssWarnings = (css: string) => ({
  importsStylesheet: /@import\b/iu.test(css),
  loadsRemoteResource: /url\(\s*["']?https?:\/\//iu.test(css),
});
