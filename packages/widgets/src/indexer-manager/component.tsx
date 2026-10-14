"use client";

import { useCallback, useMemo } from "react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeActions } from "../runtime-hooks";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { IndexerManagerView } from "./native-view";

export default function IndexerManagerWidget({
  options,
  integrationIds,
  width,
  height,
  isEditMode,
  widgetRuntimeRef,
  displayMode,
}: WidgetComponentProps<"indexerManager">) {
  const t = useI18n("widget.indexerManager");
  const tCommon = useI18n("common");
  const indexersQuery = clientApi.widget.indexerManager.getIndexersStatus.useQuery({ integrationIds });
  const indexersData = getUsableWidgetQueryData(indexersQuery) ?? [];
  const utils = clientApi.useUtils();
  const {
    mutate: testAll,
    isPending,
    error: testAllError,
  } = clientApi.widget.indexerManager.testAllIndexers.useMutation({
    onError: () => showErrorNotification({ title: tCommon("error"), message: t("error.testAll") }),
    onSettled: () => void utils.widget.indexerManager.getIndexersStatus.invalidate(),
  });
  const interactIntegrationIds = new Set(useIntegrationsWithInteractAccess().map(({ id }) => id));
  const canInteract = integrationIds.length > 0 && integrationIds.every((id) => interactIntegrationIds.has(id));
  const board = useRequiredBoard();
  const testAllIndexers = useCallback(() => {
    if (!canInteract || isPending) return;
    testAll({ integrationIds });
  }, [canInteract, integrationIds, isPending, testAll]);
  const runtimeActions = useMemo(() => ({ testAllIndexers }), [testAllIndexers]);
  useWidgetRuntimeActions(widgetRuntimeRef, runtimeActions);
  return (
    <IndexerManagerView
      options={options}
      indexersData={indexersData}
      width={width}
      height={height}
      isEditMode={isEditMode}
      displayMode={displayMode}
      isInitialPending={isInitialWidgetQueryPending(indexersQuery)}
      isPending={isPending}
      testAllError={Boolean(testAllError)}
      canInteract={canInteract}
      itemRadius={board.itemRadius}
      testAllIndexers={testAllIndexers}
      iconSizes={iconSizes}
    />
  );
}
