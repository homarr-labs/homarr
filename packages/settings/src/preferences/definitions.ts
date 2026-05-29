export const userPreferenceDefinitions = [
  { key: "colorScheme", kind: "select", guest: true, aliases: ["theme", "dark", "light", "auto"] },
  { key: "locale", kind: "select", guest: true, aliases: ["language", "translation"] },
  { key: "defaultSearchEngineId", kind: "searchEngine", guest: false, aliases: ["search", "search engine"] },
  { key: "openSearchInNewTab", kind: "boolean", guest: false, aliases: ["search", "new tab", "external"] },
  { key: "ddgBangs", kind: "boolean", guest: false, aliases: ["duckduckgo", "bangs", "search"] },
  { key: "firstDayOfWeek", kind: "select", guest: false, aliases: ["calendar", "week", "weekday"] },
  { key: "homeBoardId", kind: "board", guest: false, aliases: ["home", "board", "dashboard"] },
  { key: "mobileHomeBoardId", kind: "board", guest: false, aliases: ["mobile", "home", "board", "dashboard"] },
  { key: "pingIconsEnabled", kind: "boolean", guest: false, aliases: ["ping", "icon", "status"] },
  { key: "fullPreferencesPage", kind: "link", guest: false, aliases: ["settings", "manage", "profile"] },
] as const;

export type UserPreferenceDefinition = (typeof userPreferenceDefinitions)[number];

export type UserPreferenceKey = UserPreferenceDefinition["key"];

export type UserPreferenceKind = UserPreferenceDefinition["kind"];

export const userPreferenceDefinitionByKey = Object.fromEntries(
  userPreferenceDefinitions.map((definition) => [definition.key, definition]),
) as Record<UserPreferenceKey, UserPreferenceDefinition>;
