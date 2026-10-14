import type { RouterClient } from "@orpc/server";

import type { BackendPrincipal } from "@homarr/api/nitro";

import type { createCronJobsProcedures } from "../../../../../packages/api/src/nitro/routers/cron-jobs";
import type { createLogProcedures } from "../../../../../packages/api/src/nitro/routers/log";

export type CronJobsFeatureClient = RouterClient<ReturnType<typeof createCronJobsProcedures>>;
export type LogFeatureClient = RouterClient<ReturnType<typeof createLogProcedures>>;

export type OperationsFeatureClient = {
  readonly cronJobs: Pick<
    CronJobsFeatureClient,
    | "getJobs"
    | "subscribeToStatusUpdates"
    | "triggerJob"
    | "startJob"
    | "stopJob"
    | "updateJobInterval"
    | "disableJob"
    | "enableJob"
  >;
  readonly log: Pick<LogFeatureClient, "subscribe">;
};

export interface OperationsFeatureProps {
  readonly client: OperationsFeatureClient;
  readonly principal: BackendPrincipal;
  readonly authorityKey: string;
  readonly readOnly: boolean;
  readonly onCleanupError?: (error: unknown) => void;
}

export type OperationsJob = Awaited<ReturnType<OperationsFeatureClient["cronJobs"]["getJobs"]>>[number];
export type OperationsJobName = OperationsJob["name"];
export type OperationsStatusIterator = Awaited<
  ReturnType<OperationsFeatureClient["cronJobs"]["subscribeToStatusUpdates"]>
>;
export type OperationsLogIterator = Awaited<ReturnType<OperationsFeatureClient["log"]["subscribe"]>>;
export type OperationsJobStatus = OperationsStatusIterator extends AsyncIterator<infer T, void> ? T : never;
export type OperationsLogEvent = OperationsLogIterator extends AsyncIterator<infer T, void> ? T : never;
export type OperationsLogMessage = Extract<OperationsLogEvent, { type: "message" }>["message"];

export function operationsScopeKey({ principal, authorityKey, readOnly }: OperationsFeatureProps) {
  return JSON.stringify([
    authorityKey,
    principal.kind === "authenticated" ? principal.user.id : null,
    principal.kind === "authenticated" ? principal.user.permissions.toSorted() : [],
    readOnly,
  ]);
}
