import { useCallback } from "react";
import { Button, Stack, Text } from "@mantine/core";

import { LOG_HISTORY_MAX_ENTRIES, logLevels } from "@homarr/core/infrastructure/logs/constants";
import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { useI18n } from "@homarr/translation/standalone/client";

import { OperationsLogsView } from "../../source-ui/operations/logs-view";
import type { OperationsLogsViewProps } from "../../source-ui/operations/logs-view";
import type { OperationsFeatureProps, OperationsLogEvent, OperationsLogMessage } from "./client";
import { operationsScopeKey } from "./client";
import { OperationsAccessDenied, OperationsFailure } from "./feedback";
import { isOperationsAccessError } from "./jobs";
import { useOperationsStream } from "./stream";

const emptyLogs: {
  readonly messages: readonly OperationsLogMessage[];
  readonly updateKind: "history" | "message";
  readonly historyIdentity: object;
} = {
  messages: [],
  updateKind: "history",
  historyIdentity: {},
};

function reduceLogs(previous: typeof emptyLogs, event: OperationsLogEvent): typeof emptyLogs {
  if (event.type === "history")
    return { messages: event.messages.slice(-LOG_HISTORY_MAX_ENTRIES), updateKind: event.type, historyIdentity: event };
  return {
    messages: [...previous.messages, event.message].slice(-LOG_HISTORY_MAX_ENTRIES),
    updateKind: event.type,
    historyIdentity: previous.historyIdentity,
  };
}

export interface OperationsLogsPanelProps extends OperationsFeatureProps {
  readonly defaultLevel: LogLevel;
  readonly focusTimestamp?: number;
  readonly breadcrumb?: OperationsLogsViewProps["breadcrumb"];
  readonly height?: OperationsLogsViewProps["height"];
  readonly createRendererAddon?: OperationsLogsViewProps["createRendererAddon"];
}

export function OperationsLogsPanel(props: OperationsLogsPanelProps) {
  if (props.principal.kind !== "authenticated" || !props.principal.user.permissions.includes("other-view-logs"))
    return <OperationsAccessDenied />;
  return <LogsScope key={operationsScopeKey(props)} {...props} />;
}

function LogsScope(props: OperationsLogsPanelProps) {
  const t = useI18n();
  const open = useCallback(
    (signal: AbortSignal) => props.client.log.subscribe({ levels: [...logLevels] }, { signal }),
    [props.client],
  );
  const stream = useOperationsStream(open, reduceLogs, emptyLogs, true, props.onCleanupError);
  let focusTimestamp: number | undefined;
  if (props.focusTimestamp !== undefined && Number.isSafeInteger(props.focusTimestamp) && props.focusTimestamp > 0)
    focusTimestamp = props.focusTimestamp;
  if (stream.state.kind === "error" && isOperationsAccessError(stream.state.error)) return <OperationsAccessDenied />;
  return (
    <OperationsLogsView
      messages={stream.state.value.messages}
      updateKind={stream.state.value.updateKind}
      historyIdentity={stream.state.value.historyIdentity}
      defaultLevel={props.defaultLevel}
      focusTimestamp={focusTimestamp}
      breadcrumb={props.breadcrumb}
      height={props.height}
      createRendererAddon={props.createRendererAddon}
      feedback={
        <Stack gap="xs">
          {stream.state.kind === "loading" && <Text component="output">{t("common.action.loading")}</Text>}
          {(stream.state.kind === "error" || stream.state.kind === "closed") && (
            <OperationsFailure message={t("common.error")} retry={stream.reconnect} />
          )}
          <Button variant="default" onClick={stream.reconnect}>
            {t("common.action.refresh")}
          </Button>
        </Stack>
      }
    />
  );
}
