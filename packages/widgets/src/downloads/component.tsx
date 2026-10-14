"use client";

import { useMemo } from "react";
import { Avatar, Group, Tooltip } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess, useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { useIntegrationConnected } from "@homarr/common";
import { getIconUrl, getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ExtendedClientStatus } from "@homarr/integrations";
import { showErrorNotification } from "@homarr/notifications";
import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { HomarrDataTable } from "../common/homarr-data-table";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import { DOWNLOAD_COLUMN_ACCESSORS } from "./helpers";
import { DownloadsView } from "./native-view";
import type { DownloadsTableRenderer } from "./native-view";
import type { DataTableColumn } from "mantine-datatable";
import type { ReactNode } from "react";
import type { ExtendedDownloadClientItem } from "@homarr/integrations";

export { getSizeConfig } from "./native-view";

export default function DownloadClientsWidget({
  isEditMode,
  integrationIds,
  options,
  setOptions,
  boardId,
  itemId,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"downloads">) {
  const { formatByteRate, formatBytes, formatBytesPair } = useByteFormatter();
  const locale = useCurrentIntlLocale();
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const allInteractAccess = useIntegrationsWithInteractAccess();
  const integrationInteractSet = useMemo(
    () => new Set(allInteractAccess.filter(({ id }) => integrationIds.includes(id)).map(({ id }) => id)),
    [allInteractAccess, integrationIds],
  );
  const downloadsQuery = clientApi.widget.downloads.getJobsAndStatuses.useQuery({
    integrationIds,
    limitPerIntegration: options.limitPerIntegration,
    includeArchivedHistory: options.includeArchivedHistory,
    historyWindowDays: options.historyWindowDays,
  });
  const currentItems = getUsableWidgetQueryData(downloadsQuery);
  const t = useI18n("widget.downloads");
  const utils = clientApi.useUtils();
  const mutationOptions = {
    onSettled: () => void utils.widget.downloads.getJobsAndStatuses.invalidate(),
    onError: () => showErrorNotification({ title: t("errors.actionFailed"), message: t("errors.actionFailedMessage") }),
  };
  const { mutate: mutateResumeItem } = clientApi.widget.downloads.resumeItem.useMutation(mutationOptions);
  const { mutate: mutatePauseItem } = clientApi.widget.downloads.pauseItem.useMutation(mutationOptions);
  const { mutate: mutateDeleteItem } = clientApi.widget.downloads.deleteItem.useMutation(mutationOptions);
  const { mutate: mutateResumeQueue } = clientApi.widget.downloads.resume.useMutation(mutationOptions);
  const { mutate: mutatePauseQueue } = clientApi.widget.downloads.pause.useMutation(mutationOptions);
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    scope: { id: `downloads-options:${boardId ?? "preview"}:${itemId ?? "preview"}` },
    onError: () => showErrorNotification({ title: t("errors.actionFailed"), message: t("errors.actionFailedMessage") }),
  });
  const persistOption = useTableLayoutPersistence({ boardId, hasChangeAccess, itemId, saveItemOptions, setOptions });
  return (
    <DownloadsView
      isEditMode={isEditMode}
      integrationIds={integrationIds}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
      currentItems={currentItems}
      isFetching={downloadsQuery.isFetching}
      isInitialPending={isInitialWidgetQueryPending(downloadsQuery)}
      loadingState={<WidgetQueryLoadingState />}
      queryIndicators={
        <Group gap={0}>
          <IntegrationErrorIndicator results={currentItems ?? []} />
        </Group>
      }
      integrationInteractSet={integrationInteractSet}
      mutateResumeItem={mutateResumeItem}
      mutatePauseItem={mutatePauseItem}
      mutateDeleteItem={mutateDeleteItem}
      mutateResumeQueue={mutateResumeQueue}
      mutatePauseQueue={mutatePauseQueue}
      bindings={{
        t,
        locale,
        formatByteRate,
        formatBytes,
        formatBytesPair,
        getIconUrl,
        getIntegrationKindsByCategory,
        copyText: (text) => void navigator.clipboard.writeText(text).catch(() => {}),
        renderClientIndicator,
      }}
      renderLayout={(columns, render) => (
        <DownloadsLayoutProducer
          columns={columns}
          render={render}
          options={options}
          itemId={itemId}
          persistOption={persistOption}
        />
      )}
    />
  );
}

function DownloadsLayoutProducer({
  options,
  itemId,
  persistOption,
  columns,
  render,
}: {
  columns: DataTableColumn<ExtendedDownloadClientItem>[];
  render: (renderTable: DownloadsTableRenderer) => ReactNode;
  options: WidgetComponentProps<"downloads">["options"];
  itemId: WidgetComponentProps<"downloads">["itemId"];
  persistOption: ReturnType<typeof useTableLayoutPersistence>;
}) {
  const { effectiveColumns, storeKey } = usePersistedTableLayout({
    columns,
    columnAccessors: DOWNLOAD_COLUMN_ACCESSORS,
    columnOrder: options.columnOrder,
    columnWidths: options.columnWidths,
    itemId,
    storeKeyPrefix: "downloads",
    onLayoutChange: persistOption,
  });
  return render((props) => <HomarrDataTable {...props} columns={effectiveColumns} storeColumnsKey={storeKey} />);
}

function ClientIndicator({ integration }: { integration: ExtendedClientStatus["integration"] }) {
  const isConnected = useIntegrationConnected(integration.updatedAt, { timeout: 30000 });
  const t = useI18n("widget.downloads");
  return (
    <Tooltip label={isConnected ? integration.name : `${integration.name} ${t("disconnected")}`}>
      <Avatar
        size={18}
        radius={0}
        src={getIconUrl(integration.kind)}
        style={{ filter: isConnected ? undefined : "grayscale(100%)", opacity: isConnected ? 1 : 0.5 }}
      />
    </Tooltip>
  );
}

function renderClientIndicator(integration: ExtendedClientStatus["integration"]) {
  return <ClientIndicator integration={integration} />;
}
