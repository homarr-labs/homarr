import type { RouterOutputs } from "@homarr/api";
import { objectEntries } from "@homarr/common";
import type { Modify } from "@homarr/common/types";
import type { InferSelectModel } from "@homarr/db";
import type { apps } from "@homarr/db/schema/sqlite";
import type { OldmarrApp, OldmarrConfig } from "@homarr/old-schema";
import type { InitialOldmarrImportSettings } from "@homarr/validation";

import type { BoardSelectionMap } from "../components/initial/board-selection-card";
import type { OldmarrBookmarkDefinition } from "../widgets/definitions/bookmark";

type PreparedApp = Omit<InferSelectModel<typeof apps>, "id"> & { ids: string[] };

type AnalyseConfig = RouterOutputs["import"]["analyseOldmarrImport"]["configs"][number];

type ValidAnalyseConfig = Modify<AnalyseConfig, { config: OldmarrConfig }>;

type OldmarrIntegration = Exclude<OldmarrApp["integration"], undefined>;

export const prepareMultipleImports = (
  analyseConfigs: AnalyseConfig[],
  settings: InitialOldmarrImportSettings,
  selections: BoardSelectionMap,
) => {
  const invalidConfigs = analyseConfigs.filter((item) => item.config === null);
  invalidConfigs.forEach(({ name }) => {
    console.warn(`Skipping import of ${name} due to error in configuration. See logs of container for more details.`);
  });

  const filteredConfigs = analyseConfigs.filter((item): item is ValidAnalyseConfig => item.config !== null);

  return {
    preparedApps: prepareApps(filteredConfigs),
    preparedBoards: settings.onlyImportApps ? [] : prepareBoards(filteredConfigs, selections),
    preparedIntegrations: prepareIntegrations(filteredConfigs),
  };
};

const prepareIntegrations = (analyseConfigs: ValidAnalyseConfig[]) => {
  return analyseConfigs.flatMap(({ config }) => {
    return config.apps
      .map((app) => app.integration)
      .filter(
        (
          integration,
        ): integration is Modify<OldmarrIntegration, { type: Exclude<OldmarrIntegration["type"], undefined | null> }> =>
          Boolean(integration) && Boolean(integration?.type),
      );
  });
};

const prepareBoards = (analyseConfigs: ValidAnalyseConfig[], selections: BoardSelectionMap) => {
  return analyseConfigs.flatMap(({ name, config }) => {
    const selectedSizes = selections.get(name);
    if (!selectedSizes) return [];

    return objectEntries(selectedSizes)
      .map(([size, selected]) => {
        if (!selected) return null;

        return {
          name,
          size,
          config,
        };
      })
      .filter((board) => board !== null);
  });
};

const prepareApps = (analyseConfigs: ValidAnalyseConfig[]) => {
  const preparedApps: PreparedApp[] = [];

  analyseConfigs.forEach(({ config }) => {
    const appsFromConfig = extractAppsFromConfig(config).concat(extractBookmarkAppsFromConfig(config));
    addAppsToPreparedApps(preparedApps, appsFromConfig);
  });

  return preparedApps;
};

const extractAppsFromConfig = (config: OldmarrConfig) => {
  return config.apps.map(mapOldmarrApp);
};

const extractBookmarkAppsFromConfig = (config: OldmarrConfig) => {
  const bookmarkWidgets = config.widgets.filter((widget) => widget.type === "bookmark");
  return bookmarkWidgets.flatMap((widget) =>
    (widget.properties as OldmarrBookmarkDefinition["options"]).items.map(mapOldmarrBookmarkApp),
  );
};

const addAppsToPreparedApps = (preparedApps: PreparedApp[], configApps: InferSelectModel<typeof apps>[]) => {
  configApps.forEach(({ id, ...app }) => {
    const existingApp = preparedApps.find((preparedApp) => doAppsMatch(preparedApp, app));

    if (existingApp) {
      existingApp.ids.push(id);
      return;
    }

    preparedApps.push({
      ...app,
      ids: [id],
    });
  });
};

const doAppsMatch = (
  app1: Omit<InferSelectModel<typeof apps>, "id">,
  app2: Omit<InferSelectModel<typeof apps>, "id">,
) => {
  return (
    app1.name === app2.name &&
    app1.iconUrl === app2.iconUrl &&
    app1.description === app2.description &&
    app1.href === app2.href
  );
};

const mapOldmarrApp = (app: OldmarrApp): InferSelectModel<typeof apps> => {
  return {
    id: app.id,
    name: app.name,
    iconUrl: app.appearance.iconUrl,
    description: app.behaviour.tooltipDescription ?? null,
    href: app.behaviour.externalUrl || app.url,
  };
};

const mapOldmarrBookmarkApp = (
  app: OldmarrBookmarkDefinition["options"]["items"][number],
): InferSelectModel<typeof apps> => {
  return {
    id: app.id,
    name: app.name,
    iconUrl: app.iconUrl,
    description: null,
    href: app.href,
  };
};
