import { useMemo, useState } from "react";
import { Stack } from "@mantine/core";
import SuperJSON from "superjson";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { boardSizes } from "@homarr/old-schema";

// We don't have access to the API client here, so we need to import it from the API package
// In the future we should consider having the used router also in this package
import { clientApi } from "../../../api/src/client";
import type { AnalyseResult } from "../analyse/analyse-oldmarr-import";
import { prepareMultipleImports } from "../prepare/prepare-multiple";
import type { InitialOldmarrImportSettings } from "../settings";
import { defaultSidebarBehaviour } from "../settings";
import type { BoardSelectionMap, BoardSizeRecord } from "./initial/board-selection-card";
import { BoardSelectionCard } from "./initial/board-selection-card";
import { ImportSettingsCard } from "./initial/import-settings-card";
import { ImportSummaryCard } from "./initial/import-summary-card";
import { ImportTokenModal } from "./initial/token-modal";

interface InitialOldmarrImportProps {
  file: File;
  analyseResult: AnalyseResult;
}

export const InitialOldmarrImport = ({ file, analyseResult }: InitialOldmarrImportProps) => {
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

  const { mutateAsync, isPending } = clientApi.import.importInitialOldmarrImport.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/init");
    },
  });
  const { openModal } = useModalAction(ImportTokenModal);

  const createFormData = (token: string | null) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("settings", JSON.stringify(settings));
    // Map can not be send over the wire without superjson
    formData.set("boardSelections", SuperJSON.stringify(boardSelections));
    if (token) {
      formData.set("token", token);
    }
    return formData;
  };

  const handleSubmitAsync = async () => {
    if (analyseResult.checksum) {
      openModal({
        checksum: analyseResult.checksum,
        onSuccessAsync: async (token) => {
          await mutateAsync(createFormData(token));
        },
      });
      return;
    }
    await mutateAsync(createFormData(null));
  };

  return (
    <Stack mb="sm">
      <ImportSettingsCard
        settings={settings}
        updateSetting={(setting, value) => {
          setSettings((settings) => ({ ...settings, [setting]: value }));
        }}
      />
      {settings.onlyImportApps ? null : (
        <BoardSelectionCard selections={boardSelections} updateSelections={setBoardSelections} />
      )}
      <ImportSummaryCard
        counts={{
          apps: preparedApps.length,
          boards: preparedBoards.length,
          integrations: preparedIntegrations.length,
          credentialUsers: analyseResult.userCount,
        }}
        onSubmit={handleSubmitAsync}
        loading={isPending}
      />
    </Stack>
  );
};

const createDefaultSelections = (configs: AnalyseResult["configs"]) => {
  return configs
    .map(({ name, config }) => {
      if (!config) return null;

      const shapes = config.apps.flatMap((app) => app.shape).concat(config.widgets.flatMap((widget) => widget.shape));
      const boardSizeRecord = boardSizes.reduce<BoardSizeRecord>((acc, size) => {
        const allInclude = shapes.every((shape) => Boolean(shape[size]));
        acc[size] = allInclude ? true : null;
        return acc;
      }, {} as BoardSizeRecord);
      return [name, boardSizeRecord];
    })
    .filter((selection): selection is [string, BoardSizeRecord] => Boolean(selection));
};
