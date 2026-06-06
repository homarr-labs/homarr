import type { BundleCompatibility } from "./config-bundle-compat";

export const CONFIG_ENTITY_KEYS = [
  "boards",
  "apps",
  "integrations",
  "secrets",
  "widgets",
  "sections",
  "layouts",
  "searchEngines",
  "groups",
  "users",
  "serverSettings",
] as const;

export type ConfigEntityKey = (typeof CONFIG_ENTITY_KEYS)[number];

export type ConfigEntityCounts = Record<ConfigEntityKey, number>;

export const emptyCounts = (): ConfigEntityCounts =>
  Object.fromEntries(CONFIG_ENTITY_KEYS.map((key) => [key, 0])) as ConfigEntityCounts;

export type ConfigExportPreview = ConfigEntityCounts;

export type ConfigImportPreview = {
  compatibility: BundleCompatibility;
  meta: {
    exportedAt: string;
    homarrVersion: string;
    bundleVersion: string;
  };
  toCreate: ConfigEntityCounts;
  toReuse: {
    apps: number;
    integrations: number;
    users: number;
  };
  toSkip: {
    boards: number;
    groups: number;
    searchEngines: number;
  };
  toUpdate: {
    serverSettings: number;
  };
  warnings: string[];
};
