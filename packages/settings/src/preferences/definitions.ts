export const userPreferenceDefinitions = [
  {
    key: "colorScheme",
    kind: "select",
    guest: true,
    mutationGroup: "colorScheme",
    aliases: ["theme", "dark", "light", "auto"],
  },
  { key: "locale", kind: "select", guest: true, mutationGroup: "locale", aliases: ["language", "translation"] },
  {
    key: "defaultSearchEngineId",
    kind: "searchEngine",
    guest: false,
    mutationGroup: "searchPreferences",
    aliases: ["search", "search engine"],
  },
  {
    key: "openSearchInNewTab",
    kind: "boolean",
    guest: false,
    mutationGroup: "searchPreferences",
    aliases: ["search", "new tab", "external"],
  },
  {
    key: "ddgBangs",
    kind: "boolean",
    guest: false,
    mutationGroup: "searchPreferences",
    aliases: ["duckduckgo", "bangs", "search"],
  },
  {
    key: "firstDayOfWeek",
    kind: "select",
    guest: false,
    mutationGroup: "firstDayOfWeek",
    aliases: ["calendar", "week", "weekday"],
  },
  {
    key: "homeBoardId",
    kind: "board",
    guest: false,
    mutationGroup: "homeBoards",
    aliases: ["home", "board", "dashboard"],
  },
  {
    key: "mobileHomeBoardId",
    kind: "board",
    guest: false,
    mutationGroup: "homeBoards",
    aliases: ["mobile", "home", "board", "dashboard"],
  },
  {
    key: "pingIconsEnabled",
    kind: "boolean",
    guest: false,
    mutationGroup: "pingIconsEnabled",
    aliases: ["ping", "icon", "status"],
  },
  {
    key: "fullPreferencesPage",
    kind: "link",
    guest: false,
    mutationGroup: null,
    aliases: ["settings", "manage", "profile"],
  },
] as const;

export type UserPreferenceDefinition = (typeof userPreferenceDefinitions)[number];
export type UserPreferenceKey = UserPreferenceDefinition["key"];
export type UserPreferenceKind = UserPreferenceDefinition["kind"];
export type UserPreferenceMutationGroup = Exclude<UserPreferenceDefinition["mutationGroup"], null>;

export const userPreferenceDefinitionByKey = Object.fromEntries(
  userPreferenceDefinitions.map((definition) => [definition.key, definition]),
) as Record<UserPreferenceKey, UserPreferenceDefinition>;

export const visiblePreferenceDefinitions = (isAuthenticated: boolean) =>
  userPreferenceDefinitions.filter((definition) => definition.guest || isAuthenticated);
