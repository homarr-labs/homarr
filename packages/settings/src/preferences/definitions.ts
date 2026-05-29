export const userPreferenceDefinitions = [
  { key: "colorScheme", kind: "select", guest: true },
  { key: "locale", kind: "select", guest: true },
  { key: "defaultSearchEngineId", kind: "searchEngine", guest: false },
  { key: "openSearchInNewTab", kind: "boolean", guest: false },
  { key: "ddgBangs", kind: "boolean", guest: false },
  { key: "firstDayOfWeek", kind: "select", guest: false },
  { key: "homeBoardId", kind: "board", guest: false },
  { key: "mobileHomeBoardId", kind: "board", guest: false },
  { key: "pingIconsEnabled", kind: "boolean", guest: false },
  { key: "fullPreferencesPage", kind: "link", guest: false },
] as const;

export type UserPreferenceDefinition = (typeof userPreferenceDefinitions)[number];

export type UserPreferenceKey = UserPreferenceDefinition["key"];

export type UserPreferenceKind = UserPreferenceDefinition["kind"];

export const userPreferenceDefinitionByKey = Object.fromEntries(
  userPreferenceDefinitions.map((definition) => [definition.key, definition]),
) as Record<UserPreferenceKey, UserPreferenceDefinition>;
