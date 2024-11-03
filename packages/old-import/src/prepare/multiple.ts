import SuperJSON from "superjson";

import type { InferInsertModel } from "@homarr/db";
import type { apps } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { prepareImport } from ".";
import type { WidgetComponentProps } from "../../../widgets/src";
import { doAppsMatch } from "../compare/apps";

type ImportSpecificConfigurationFields = keyof Pick<OldmarrImportConfiguration, "name" | "screenSize">;

export const prepareMultipleImports = (
  imports: { configuration: Pick<OldmarrImportConfiguration, ImportSpecificConfigurationFields>; old: OldmarrConfig }[],
  configuration: Omit<OldmarrImportConfiguration, ImportSpecificConfigurationFields>,
) => {
  const preparedImports = imports.map(({ configuration: { name, screenSize }, old }) => {
    try {
      return prepareImport(old, { ...configuration, name, screenSize });
    } catch (error) {
      console.log(error);
      return {
        apps: [],
        boards: [],
        sections: [],
        items: [],
        integrations: [],
      };
    }
  });

  const preparedApps = preparedImports.flatMap((preparedImport) => preparedImport.apps);
  const { apps: filteredApps, mapping } = distinctApps(preparedApps, configuration.distinctAppsByHref);

  const preparedItems = preparedImports.flatMap((preparedImport) => preparedImport.items);

  // Changes the referenced apps for the item options to the distinct apps that actually are created
  if (mapping.size >= 1 && preparedItems.length >= 1) {
    preparedItems.forEach((item) => {
      if (item.kind !== "app" && item.kind !== "bookmarks") return;
      if (!item.options) return;

      if (item.kind === "app") {
        const oldOptions = SuperJSON.parse<WidgetComponentProps<"app">["options"]>(item.options);
        oldOptions.appId = mapping.get(oldOptions.appId) ?? oldOptions.appId;
        item.options = SuperJSON.stringify(oldOptions);
        return;
      }

      const oldOptions = SuperJSON.parse<WidgetComponentProps<"bookmarks">["options"]>(item.options);
      oldOptions.items = oldOptions.items.map((bookmarkItem) => mapping.get(bookmarkItem) ?? bookmarkItem);
      item.options = SuperJSON.stringify(oldOptions);
      return;
    });
  }

  return {
    apps: filteredApps,
    boards: preparedImports.flatMap((preparedImport) => preparedImport.boards),
    sections: preparedImports.flatMap((preparedImport) => preparedImport.sections),
    items: preparedItems,
    integrations: preparedImports.flatMap((preparedImport) => preparedImport.integrations),
  };
};

const distinctApps = (preparedApps: InferInsertModel<typeof apps>[], distinct: boolean) => {
  const mapping = new Map<string, string>();

  if (!distinct) {
    return { apps: preparedApps, mapping };
  }

  const result = preparedApps.reduce<InferInsertModel<typeof apps>[]>((previousApps, nextApp) => {
    const existingApp = previousApps.find((existingApp) => doAppsMatch(existingApp, nextApp));
    if (!existingApp) {
      return [...previousApps, nextApp];
    }

    mapping.set(nextApp.id, existingApp.id);

    return previousApps;
  }, []);

  return {
    apps: result,
    mapping,
  };
};
