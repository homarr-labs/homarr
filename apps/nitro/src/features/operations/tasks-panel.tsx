import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useRef } from "react";
import { Alert, Stack, Text, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

import { OperationsTasksTable } from "../../source-ui/operations/tasks-table";
import type { OperationsFeatureProps, OperationsJob, OperationsJobStatus } from "./client";
import { operationsScopeKey } from "./client";
import { OperationsAccessDenied, OperationsFailure, OperationsLoading } from "./feedback";
import type { OperationsJobFeedback } from "./jobs";
import { isOperationsAccessError, useOperationsJobs } from "./jobs";
import { useOperationsStream } from "./stream";

const emptyStatuses: ReadonlyMap<string, OperationsJobStatus> = new Map();

function reduceStatus(previous: ReadonlyMap<string, OperationsJobStatus>, status: OperationsJobStatus) {
  return new Map(previous).set(status.name, status);
}

export interface OperationsTasksPanelProps extends OperationsFeatureProps {
  readonly initialJobs?: OperationsJob[];
  readonly breadcrumb?: ReactNode;
  readonly heldReason?: string;
  readonly onFeedback?: (notification: OperationsTaskNotification) => void;
}

export interface OperationsTaskNotification {
  readonly kind: "success" | "error";
  readonly title: string;
  readonly message: string;
}

export function OperationsTasksPanel(props: OperationsTasksPanelProps) {
  if (props.principal.kind !== "authenticated" || !props.principal.user.permissions.includes("admin"))
    return <OperationsAccessDenied />;
  return <TasksScope key={operationsScopeKey(props)} {...props} />;
}

function TasksScope(props: OperationsTasksPanelProps) {
  const t = useI18n();
  const tTasks = useI18n("management.page.tool.tasks");
  const jobs = useOperationsJobs(props, props.initialJobs);
  const open = useCallback(
    (signal: AbortSignal) => props.client.cronJobs.subscribeToStatusUpdates(undefined, { signal }),
    [props.client],
  );
  const stream = useOperationsStream(
    open,
    reduceStatus,
    emptyStatuses,
    jobs.state.kind !== "denied",
    props.onCleanupError,
  );
  const statusAccessDenied = stream.state.kind === "error" && isOperationsAccessError(stream.state.error);
  const deny = jobs.deny;
  useEffect(() => {
    if (statusAccessDenied) deny();
  }, [statusAccessDenied, deny]);
  if (jobs.state.kind === "denied" || statusAccessDenied) return <OperationsAccessDenied />;
  if (jobs.state.kind === "loading") return <OperationsLoading />;
  if (jobs.state.kind === "error")
    return <OperationsFailure message={tTasks("refresh.error.message")} retry={jobs.refresh} />;

  return (
    <>
      {props.breadcrumb}
      <Stack>
        <Title order={1}>{t("common.entity.tasks")}</Title>
        {jobs.feedback && <TaskFeedback feedback={jobs.feedback} onFeedback={props.onFeedback} />}
        {(stream.state.kind === "error" || stream.state.kind === "closed") && (
          <OperationsFailure message={t("common.error")} retry={stream.reconnect} />
        )}
        <Suspense fallback={<OperationsLoading />}>
          <OperationsTasksTable
            jobs={jobs.state.jobs}
            statuses={stream.state.value}
            pending={jobs.pending}
            readOnly={props.readOnly}
            heldReason={props.heldReason}
            refreshing={jobs.refreshing}
            onRefresh={jobs.refresh}
            onTrigger={(job) => jobs.run({ kind: "trigger", name: job.name })}
            onToggle={(job) => jobs.run({ kind: job.isEnabled ? "disable" : "enable", name: job.name })}
            onInterval={(job, cron) => jobs.run({ kind: "interval", name: job.name, cron })}
          />
        </Suspense>
      </Stack>
    </>
  );
}

function TaskFeedback({
  feedback,
  onFeedback,
}: {
  feedback: OperationsJobFeedback;
  onFeedback?: OperationsTasksPanelProps["onFeedback"];
}) {
  const t = useI18n();
  const tTasks = useI18n("management.page.tool.tasks");
  const sent = useRef<OperationsJobFeedback | null>(null);
  let message: string;
  switch (feedback.action) {
    case "interval":
      message = tTasks(`interval.update.${feedback.kind}.message`);
      break;
    case "trigger":
      message = tTasks(`trigger.${feedback.kind}.message`);
      break;
    case "refresh":
      message = tTasks(`refresh.${feedback.kind}.message`);
      break;
    case "enable":
    case "disable":
      message =
        feedback.kind === "error" ? tTasks("toggle.error.message") : tTasks(`${feedback.action}.success.message`);
      break;
    case "start":
    case "stop":
      message = t(`common.${feedback.kind}`);
      break;
  }
  const title = t(`common.${feedback.kind}`);
  useEffect(() => {
    if (!onFeedback || sent.current === feedback) return;
    sent.current = feedback;
    onFeedback({ kind: feedback.kind, title, message });
  }, [feedback, title, message, onFeedback]);
  if (onFeedback) return null;
  return (
    <Alert color={feedback.kind === "success" ? "green" : "red"} role={feedback.kind === "error" ? "alert" : "status"}>
      <Stack gap="xs">
        <Text size="sm">{message}</Text>
        {feedback.kind === "error" && feedback.error instanceof Error && (
          <Text size="sm">{feedback.error.message}</Text>
        )}
      </Stack>
    </Alert>
  );
}
