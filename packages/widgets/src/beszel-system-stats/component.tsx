"use client";

import { useCallback, useMemo, useRef } from "react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { BeszelStatsView } from "../beszel/_shared/stats-view";
import { createBeszelSystemChoices, resolveBeszelSystemChoice } from "./selection";
import { NativeBeszelSystemStatsView } from "./native-view";

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayScale = 1,
  displayMode,
  boardId,
  itemId,
  setOptions,
  widgetRuntimeRef,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useI18n("widget.beszelSystemStats");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const selectionSavePendingRef = useRef(false);
  const { mutate: saveItemOptions, isPending: isSelectionSavePending } =
    clientApi.widget.options.saveItemOptions.useMutation({
      onError: () =>
        showErrorNotification({ title: t("error.selectionSaveTitle"), message: t("error.selectionSaveMessage") }),
    });
  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const systemsData = getUsableWidgetQueryData(systemsQuery);
  const systemsResult = useMemo(() => systemsData ?? [], [systemsData]);
  const systems = useMemo(() => createBeszelSystemChoices(systemsResult), [systemsResult]);
  const selectedSystem = resolveBeszelSystemChoice(systems, options.systemId);
  const includeDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;
  const timePeriod: BeszelTimePeriod = options.timePeriod;
  useWidgetRuntimeQueries(
    widgetRuntimeRef,
    selectedSystem && timePeriod !== "1m"
      ? [
          getQueryKey(
            clientApi.widget.beszel.getSystemStats,
            {
              integrationIds: [selectedSystem.integrationId],
              systemId: selectedSystem.systemId,
              timePeriod,
              includeDocker,
            },
            "query",
          ),
        ]
      : [],
  );

  const handleSelectSystem = useCallback(
    (value: string) => {
      if (selectionSavePendingRef.current) return;
      const previousValue = options.systemId;
      setOptions({ newOptions: { systemId: value } });
      if (hasChangeAccess && boardId && itemId) {
        selectionSavePendingRef.current = true;
        saveItemOptions(
          { boardId, itemId, newOptions: { systemId: value } },
          {
            onError: () => setOptions({ newOptions: { systemId: previousValue } }),
            onSettled: () => {
              selectionSavePendingRef.current = false;
            },
          },
        );
      }
    },
    [boardId, hasChangeAccess, itemId, options.systemId, saveItemOptions, setOptions],
  );

  const handleTimePeriod = useCallback(
    (value: BeszelTimePeriod) => {
      if (selectionSavePendingRef.current) return;
      const previousValue = options.timePeriod;
      setOptions({ newOptions: { timePeriod: value } });
      if (hasChangeAccess && boardId && itemId) {
        selectionSavePendingRef.current = true;
        saveItemOptions(
          { boardId, itemId, newOptions: { timePeriod: value } },
          {
            onError: () => setOptions({ newOptions: { timePeriod: previousValue } }),
            onSettled: () => {
              selectionSavePendingRef.current = false;
            },
          },
        );
      }
    },
    [boardId, hasChangeAccess, itemId, options.timePeriod, saveItemOptions, setOptions],
  );

  return (
    <NativeBeszelSystemStatsView
      options={options}
      isEditMode={isEditMode}
      width={width}
      height={height}
      displayScale={displayScale}
      displayMode={displayMode}
      systems={systems}
      systemsPending={systemsQuery.isPending}
      isSelectionSavePending={isSelectionSavePending}
      queryIndicators={<IntegrationErrorIndicator results={systemsResult} />}
      handleSelectSystem={handleSelectSystem}
      handleTimePeriod={handleTimePeriod}
      renderStats={(props) => <BeszelStatsView {...props} />}
      timePeriod={timePeriod}
    />
  );
}
