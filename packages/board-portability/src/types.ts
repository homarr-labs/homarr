import type { BundleCompatibility } from "./config-bundle-compat";

export type ConfigEntityCounts = {
  boards: number;
  apps: number;
  integrations: number;
  secrets: number;
  widgets: number;
  sections: number;
  layouts: number;
  searchEngines: number;
  groups: number;
  serverSettings: number;
};

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
