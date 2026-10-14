"use client";

import { useCallback, useMemo } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import { useBeszelFilteredSystems } from "../beszel/_shared/hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";
import { NativeBeszelSystemTableView } from "./native-view";
import type { SystemRowWithKey } from "./native-view";

export default function BeszelSystemTableWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
  displayMode,
}: WidgetComponentProps<"beszelSystemTable">) {
  const t = useI18n("widget.beszelSystemTable");
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const { formatByteRate, formatBytes } = useByteFormatter();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const systemsData = getUsableWidgetQueryData(systemsQuery);
  const results = useMemo(() => systemsData ?? [], [systemsData]);
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    onError: () => showErrorNotification({ title: t("error.layoutSaveTitle"), message: t("error.layoutSaveMessage") }),
  });
  const persistLayout = useTableLayoutPersistence({ boardId, hasChangeAccess, itemId, saveItemOptions, setOptions });
  const filteredSystems = useBeszelFilteredSystems(results, options.statusFilter);
  const integrationNames = useMemo(
    () => new Map(results.map((result) => [result.integrationId, result.integrationName])),
    [results],
  );
  const systemsWithSource = useMemo(
    () =>
      filteredSystems.map((system) => ({
        ...system,
        integrationName: integrationNames.get(system.rowKey.split(":")[0] ?? "") ?? "—",
      })),
    [filteredSystems, integrationNames],
  );
  const onOpenSystem = useCallback(
    (record: SystemRowWithKey) => {
      const integrationId = record.rowKey.split(":")[0] ?? "";
      openModal({ integrationId, systemId: record.id }, { title: record.name });
    },
    [openModal],
  );

  return (
    <NativeBeszelSystemTableView
      options={options}
      isEditMode={isEditMode}
      width={width}
      itemId={itemId}
      displayMode={displayMode}
      systemsWithSource={systemsWithSource}
      isPending={systemsQuery.isPending}
      queryIndicators={<IntegrationErrorIndicator results={results} />}
      formatByteRate={formatByteRate}
      formatBytes={formatBytes}
      persistLayout={persistLayout}
      onOpenSystem={onOpenSystem}
    />
  );
}
