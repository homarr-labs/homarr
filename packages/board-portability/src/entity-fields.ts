/**
 * Declarative field definitions for entities in the config bundle.
 *
 * To add a new user preference:
 *   1. Add the column to the DB schema (migration)
 *   2. Add the field name to USER_DIRECT_FIELDS below
 *   That's it — export, import, and schema all derive from this.
 *
 * To add a new FK reference on users:
 *   1. Add the column to the DB schema (migration)
 *   2. Add an entry to USER_REF_FIELDS below (bundleKey → dbColumn → refMap name)
 */

/**
 * User fields copied directly between bundle and DB (no transformation).
 * Adding a new preference here automatically includes it in export AND import.
 */
export const USER_DIRECT_FIELDS = [
  "name",
  "email",
  "password",
  "provider",
  "colorScheme",
  "firstDayOfWeek",
  "openSearchInNewTab",
  "ddgBangs",
  "pingIconsEnabled",
] as const;

export type UserDirectField = (typeof USER_DIRECT_FIELDS)[number];

/**
 * User FK reference fields: bundle uses `xxxRef`, DB uses `xxxId`.
 * Key = bundle field name (with "Ref" suffix)
 * Value = which ref map to use during import (matches the entity group name)
 */
export const USER_REF_FIELDS = {
  homeBoardRef: "boards",
  mobileHomeBoardRef: "boards",
  defaultSearchEngineRef: "searchEngines",
} as const;

export type UserRefField = keyof typeof USER_REF_FIELDS;

/**
 * Derives the DB column name from a bundle ref field name.
 * "homeBoardRef" → "homeBoardId"
 */
export const refFieldToDbColumn = (refField: string): string =>
  refField.replace(/Ref$/, "Id");

/**
 * Group FK reference fields.
 */
export const GROUP_REF_FIELDS = {
  ownerRef: "users",
  homeBoardRef: "boards",
  mobileHomeBoardRef: "boards",
} as const;
