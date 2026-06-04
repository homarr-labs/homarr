import SuperJSON from "superjson";

import type { Database } from "@homarr/db";
import { groups, searchEngines } from "@homarr/db/schema";
import type { IntegrationKind } from "@homarr/definitions";

import { assessBundleCompatibility } from "../config-bundle-compat";
import type { HomarrConfigBundle } from "../schema";
import type { ConfigEntityCounts, ConfigImportPreview } from "../types";
import { doAppsMatch } from "./match-apps";

const emptyCounts = (): ConfigEntityCounts => ({
  boards: 0,
  apps: 0,
  integrations: 0,
  secrets: 0,
  widgets: 0,
  sections: 0,
  layouts: 0,
  searchEngines: 0,
  groups: 0,
  serverSettings: 0,
});

const integrationMatches = (
  bundleIntegration: HomarrConfigBundle["integrations"][number],
  existing: { kind: IntegrationKind; name: string; url: string },
) =>
  bundleIntegration.kind === existing.kind &&
  bundleIntegration.name === existing.name &&
  bundleIntegration.url === existing.url;

const countBoardEntities = (board: HomarrConfigBundle["boards"][number]) => {
  const widgetCount = board.items.length;
  const sectionCount = board.sections.length;
  const layoutCount = board.layouts.length;
  return { widgetCount, sectionCount, layoutCount };
};

export const previewImportFullConfigAsync = async (
  db: Database,
  content: string,
  currentHomarrVersion: string,
): Promise<ConfigImportPreview> => {
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      compatibility: {
        status: "invalidStructure",
        bundleVersion: null,
        bundleHomarrVersion: null,
        currentHomarrVersion,
        issues: ["File is not valid JSON"],
      },
      meta: { exportedAt: "", homarrVersion: "", bundleVersion: "" },
      toCreate: emptyCounts(),
      toReuse: { apps: 0, integrations: 0 },
      toSkip: { boards: 0, groups: 0, searchEngines: 0 },
      toUpdate: { serverSettings: 0 },
      warnings: [],
    };
  }

  const { bundle, compatibility } = assessBundleCompatibility(parsed, currentHomarrVersion);

  if (!bundle || compatibility.status !== "compatible") {
    return {
      compatibility,
      meta: {
        exportedAt: typeof (parsed as Record<string, unknown>).exportedAt === "string" ? ((parsed as Record<string, unknown>).exportedAt as string) : "",
        homarrVersion:
          typeof (parsed as Record<string, unknown>).homarrVersion === "string"
            ? ((parsed as Record<string, unknown>).homarrVersion as string)
            : "",
        bundleVersion:
          typeof (parsed as Record<string, unknown>).version === "string"
            ? ((parsed as Record<string, unknown>).version as string)
            : "",
      },
      toCreate: emptyCounts(),
      toReuse: { apps: 0, integrations: 0 },
      toSkip: { boards: 0, groups: 0, searchEngines: 0 },
      toUpdate: { serverSettings: 0 },
      warnings: compatibility.issues,
    };
  }

  const existingApps = await db.query.apps.findMany();
  const existingIntegrations = await db.query.integrations.findMany();
  const existingBoards = await db.query.boards.findMany();
  const existingGroups = await db.select().from(groups);
  const existingSearchEngines = await db.select().from(searchEngines);
  const existingSettingsByKey = new Map(
    (await db.query.serverSettings.findMany()).map((setting) => [setting.settingKey, setting.value] as const),
  );

  const existingBoardNames = new Set(existingBoards.map((board) => board.name));
  const existingGroupNames = new Set(existingGroups.map((group) => group.name));
  const existingSearchEngineShorts = new Set(existingSearchEngines.map((engine) => engine.short));

  const toCreate = emptyCounts();
  let reuseApps = 0;
  let reuseIntegrations = 0;
  let skipBoards = 0;
  let skipGroups = 0;
  let skipSearchEngines = 0;
  let updateServerSettings = 0;

  for (const bundleApp of bundle.apps) {
    const existing = existingApps.find((app) =>
      doAppsMatch(app, {
        name: bundleApp.name,
        iconUrl: bundleApp.iconUrl,
        description: bundleApp.description ?? null,
        href: bundleApp.href,
        pingUrl: bundleApp.pingUrl ?? null,
      }),
    );
    if (existing) {
      reuseApps += 1;
      continue;
    }
    toCreate.apps += 1;
  }

  for (const bundleIntegration of bundle.integrations) {
    const existing = existingIntegrations.find((integration) => integrationMatches(bundleIntegration, integration));
    if (existing) {
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
    const counts = countBoardEntities(bundleBoard);
    toCreate.widgets += counts.widgetCount;
    toCreate.sections += counts.sectionCount;
    toCreate.layouts += counts.layoutCount;
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
    toReuse: { apps: reuseApps, integrations: reuseIntegrations },
    toSkip: { boards: skipBoards, groups: skipGroups, searchEngines: skipSearchEngines },
    toUpdate: { serverSettings: updateServerSettings },
    warnings,
  };
};
