import { useMemo, useState } from "react";
import { Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { boardSizes } from "@homarr/old-schema";

import { prepareMultipleImports } from "../prepare/prepare-multiple";
import type { InitialOldmarrImportSettings } from "../settings";
import { defaultSidebarBehaviour } from "../settings";
import type { BoardSelectionMap, BoardSizeRecord } from "./initial/board-selection-card";
import { BoardSelectionCard } from "./initial/board-selection-card";
import { ImportSettingsCard } from "./initial/import-settings-card";
import { ImportSummaryCard } from "./initial/import-summary-card";

interface InitialOldmarrImportProps {
  analyseResult: RouterOutputs["import"]["analyseOldmarrImport"];
}

export const InitialOldmarrImport = ({ analyseResult }: InitialOldmarrImportProps) => {
  const [boardSelections, setBoardSelections] = useState<BoardSelectionMap>(
    new Map(createDefaultSelections(analyseResult.configs)),
  );
  const [settings, setSettings] = useState<InitialOldmarrImportSettings>({
    onlyImportApps: false,
    sidebarBehaviour: defaultSidebarBehaviour,
  });

  const { preparedApps, preparedBoards, preparedIntegrations } = useMemo(
    () => prepareMultipleImports(analyseResult.configs, settings, boardSelections),
    [analyseResult, boardSelections, settings],
  );

  return (
    <Stack mb="sm">
      <ImportSettingsCard
        settings={settings}
        updateSetting={(setting, value) => {
          setSettings((settings) => ({ ...settings, [setting]: value }));
        }}
      />
      <BoardSelectionCard selections={boardSelections} updateSelections={setBoardSelections} />
      <ImportSummaryCard
        counts={{
          apps: preparedApps.length,
          boards: preparedBoards.length,
          integrations: preparedIntegrations.length,
          users: analyseResult.userCount,
        }}
      />
    </Stack>
  );
};

const createDefaultSelections = (configs: RouterOutputs["import"]["analyseOldmarrImport"]["configs"]) => {
  return configs
    .map(({ name, config }) => {
      if (!config) return null;

      const shapes = config.apps.flatMap((app) => app.shape).concat(config.widgets.flatMap((widget) => widget.shape));
      const boardSizeRecord = boardSizes.reduce<BoardSizeRecord>((acc, size) => {
        const allInclude = shapes.every((shape) => Boolean(shape[size]));
        acc[size] = allInclude ? true : undefined;
        return acc;
      }, {} as BoardSizeRecord);
      return [name, boardSizeRecord];
    })
    .filter((selection): selection is [string, BoardSizeRecord] => Boolean(selection));
};
