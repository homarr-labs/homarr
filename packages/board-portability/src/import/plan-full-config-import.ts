import SuperJSON from "superjson";

import type { Database } from "@homarr/db";
import type { IntegrationKind } from "@homarr/definitions";

import { assessBundleCompatibility } from "../config-bundle-compat";
import type { HomarrConfigBundle } from "../schema";
import type { ConfigEntityCounts, ConfigImportPreview } from "../types";
import { emptyCounts } from "../types";
import { loadExistingEntitiesAsync } from "./load-existing-entities";
import { doAppsMatch } from "./match-apps";

const emptyPreview = (
  compatibility: ConfigImportPreview["compatibility"],
  meta: ConfigImportPreview["meta"],
  warnings: string[] = [],
): ConfigImportPreview => ({
  compatibility,
  meta,
  toCreate: emptyCounts(),
  toReuse: { apps: 0, integrations: 0, users: 0 },
  toSkip: { boards: 0, groups: 0, searchEngines: 0 },
  toUpdate: { serverSettings: 0 },
  warnings,
});

const extractMetaFromUnknown = (parsed: unknown): ConfigImportPreview["meta"] => {
  const obj = parsed as Record<string, unknown>;
  return {
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
    homarrVersion: typeof obj.homarrVersion === "string" ? obj.homarrVersion : "",
    bundleVersion: typeof obj.version === "string" ? obj.version : "",
  };
};

const integrationMatches = (
  bundleIntegration: HomarrConfigBundle["integrations"][number],
  existing: { kind: IntegrationKind; name: string; url: string },
) =>
  bundleIntegration.kind === existing.kind &&
  bundleIntegration.name === existing.name &&
  bundleIntegration.url === existing.url;

export const previewImportFullConfigAsync = async (
  db: Database,
  content: string,
  currentHomarrVersion: string,
): Promise<ConfigImportPreview> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return emptyPreview(
      { status: "invalidStructure", bundleVersion: null, bundleHomarrVersion: null, currentHomarrVersion, issues: ["File is not valid JSON"] },
      { exportedAt: "", homarrVersion: "", bundleVersion: "" },
    );
  }

  const { bundle, compatibility } = assessBundleCompatibility(parsed, currentHomarrVersion);

  if (!bundle || compatibility.status !== "compatible") {
    return emptyPreview(compatibility, extractMetaFromUnknown(parsed), compatibility.issues);
  }

  const existing = await loadExistingEntitiesAsync(db);
  const existingSettingsByKey = new Map(
    existing.serverSettings.map((setting) => [setting.settingKey, setting.value] as const),
  );

  const existingBoardNames = new Set(existing.boards.map((b) => b.name));
  const existingGroupNames = new Set(existing.groups.map((g) => g.name));
  const existingSearchEngineShorts = new Set(existing.searchEngines.map((se) => se.short));
  const existingUserEmails = new Set(existing.users.filter((u) => u.email).map((u) => u.email!));

  const toCreate = emptyCounts();
  const warnings: string[] = [];
  let reuseApps = 0;
  let reuseIntegrations = 0;
  let reuseUsers = 0;
  let skipBoards = 0;
  let skipGroups = 0;
  let skipSearchEngines = 0;
  let updateServerSettings = 0;

  for (const bundleApp of bundle.apps) {
    const matched = existing.apps.find((app) =>
      doAppsMatch(app, {
        name: bundleApp.name,
        iconUrl: bundleApp.iconUrl,
        description: bundleApp.description ?? null,
        href: bundleApp.href,
        pingUrl: bundleApp.pingUrl ?? null,
      }),
    );
    if (matched) {
      reuseApps += 1;
      continue;
    }
    toCreate.apps += 1;
  }

  for (const bundleIntegration of bundle.integrations) {
    const matched = existing.integrations.find((i) => integrationMatches(bundleIntegration, i));
    if (matched) {
      reuseIntegrations += 1;
      continue;
    }
    toCreate.integrations += 1;
    toCreate.secrets += bundleIntegration.secrets.length;
  }

  for (const bundleBoard of bundle.boards) {
    if (existingBoardNames.has(bundleBoard.name)) {
      skipBoards += 1;
      warnings.push(`Board "${bundleBoard.name}" already exists and will be skipped`);
      continue;
    }
    toCreate.boards += 1;
    toCreate.widgets += bundleBoard.items.length;
    toCreate.sections += bundleBoard.sections.length;
    toCreate.layouts += bundleBoard.layouts.length;
  }

  for (const bundleGroup of bundle.groups) {
    if (existingGroupNames.has(bundleGroup.name)) {
      skipGroups += 1;
      warnings.push(`Group "${bundleGroup.name}" already exists and will be skipped`);
      continue;
    }
    toCreate.groups += 1;
  }

  for (const bundleSearchEngine of bundle.searchEngines) {
    if (existingSearchEngineShorts.has(bundleSearchEngine.short)) {
      skipSearchEngines += 1;
      warnings.push(`Search engine "${bundleSearchEngine.name}" already exists and will be skipped`);
      continue;
    }
    toCreate.searchEngines += 1;
  }

  for (const bundleUser of bundle.users ?? []) {
    if (bundleUser.email && existingUserEmails.has(bundleUser.email)) {
      reuseUsers += 1;
      continue;
    }
    toCreate.users += 1;
  }

  for (const [settingKey, value] of Object.entries(bundle.serverSettings)) {
    const serialized = SuperJSON.stringify(value);
    const existingValue = existingSettingsByKey.get(settingKey);
    if (existingValue === undefined) {
      toCreate.serverSettings += 1;
      continue;
    }
    if (existingValue !== serialized) {
      updateServerSettings += 1;
    }
  }

  return {
    compatibility,
    meta: {
      exportedAt: bundle.exportedAt,
      homarrVersion: bundle.homarrVersion,
      bundleVersion: bundle.version,
    },
    toCreate,
    toReuse: { apps: reuseApps, integrations: reuseIntegrations, users: reuseUsers },
    toSkip: { boards: skipBoards, groups: skipGroups, searchEngines: skipSearchEngines },
    toUpdate: { serverSettings: updateServerSettings },
    warnings,
  };
};
