import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORPCError } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import type { OperationsFeatureClient, OperationsFeatureProps, OperationsJob, OperationsJobName } from "./client";
import { operationsScopeKey } from "./client";
import { isOperationsCronInterval } from "./intervals";

export type OperationsJobAction =
  | { readonly kind: "trigger"; readonly name: OperationsJobName }
  | { readonly kind: "enable"; readonly name: OperationsJobName }
  | { readonly kind: "disable"; readonly name: OperationsJobName }
  | { readonly kind: "start"; readonly name: OperationsJobName }
  | { readonly kind: "stop"; readonly name: OperationsJobName }
  | { readonly kind: "interval"; readonly name: OperationsJobName; readonly cron: string };

type JobsState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly jobs: readonly OperationsJob[] }
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "denied" };

export type OperationsJobFeedback =
  | { readonly kind: "success"; readonly action: OperationsJobAction["kind"] | "refresh" }
  | { readonly kind: "error"; readonly action: OperationsJobAction["kind"] | "refresh"; readonly error: unknown };

export const isOperationsAccessError = (error: unknown) =>
  error instanceof ORPCError && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN");

export function createOperationsQueryUtils(client: OperationsFeatureClient, scopeKey: string) {
  return createTanstackQueryUtils(client, { prefix: scopeKey });
}

interface OperationsLifetime {
  readonly controller: AbortController;
  readonly client: OperationsFeatureClient;
}

interface OperationsSubmission {
  readonly action: OperationsJobAction;
  readonly client: OperationsFeatureClient;
  readonly signal: AbortSignal;
  readonly lifetime: OperationsLifetime;
}

function dispatchSubmittedOperation(
  submission: OperationsSubmission,
  current: OperationsLifetime | null,
): Promise<void> {
  submission.signal.throwIfAborted();
  if (
    current !== submission.lifetime ||
    submission.client !== submission.lifetime.client ||
    submission.signal !== submission.lifetime.controller.signal
  ) {
    throw new DOMException("Task submission was retired", "AbortError");
  }
  const { action, client, signal } = submission;
  switch (action.kind) {
    case "trigger":
      return client.cronJobs.triggerJob(action.name, { signal });
    case "enable":
      return client.cronJobs.enableJob(action.name, { signal });
    case "disable":
      return client.cronJobs.disableJob(action.name, { signal });
    case "start":
      return client.cronJobs.startJob(action.name, { signal });
    case "stop":
      return client.cronJobs.stopJob(action.name, { signal });
    case "interval":
      return client.cronJobs.updateJobInterval({ name: action.name, cron: action.cron }, { signal });
  }
}

export function useOperationsJobs(props: OperationsFeatureProps, initialJobs?: OperationsJob[]) {
  const { client, readOnly } = props;
  const queryClient = useQueryClient();
  const scopeKey = operationsScopeKey(props);
  const utils = useMemo(() => createOperationsQueryUtils(client, scopeKey), [client, scopeKey]);
  const queryKey = useMemo(() => utils.cronJobs.getJobs.queryKey(), [utils]);
  const [denied, setDenied] = useState(false);
  const [pending, setPending] = useState<ReadonlyMap<OperationsJobName, OperationsJobAction["kind"]>>(new Map());
  const [feedback, setFeedback] = useState<OperationsJobFeedback | null>(null);
  const lifetime = useRef<OperationsLifetime | null>(null);
  const locks = useRef(new Set<OperationsJobName>());
  const query = useQuery(
    utils.cronJobs.getJobs.queryOptions({ initialData: initialJobs, refetchOnMount: false, enabled: !denied }),
  );

  const submissionOptions: UseMutationOptions<void, unknown, OperationsSubmission> = {
    networkMode: "always",
    retry: false,
    mutationFn: (submission) => dispatchSubmittedOperation(submission, lifetime.current),
  };

  const trigger = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.triggerJob.mutationKey() });
  const enable = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.enableJob.mutationKey() });
  const disable = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.disableJob.mutationKey() });
  const start = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.startJob.mutationKey() });
  const stop = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.stopJob.mutationKey() });
  const interval = useMutation({ ...submissionOptions, mutationKey: utils.cronJobs.updateJobInterval.mutationKey() });

  const deny = useCallback(() => {
    lifetime.current?.controller.abort();
    locks.current.clear();
    setDenied(true);
    setPending(new Map());
    setFeedback(null);
    void queryClient
      .cancelQueries({ queryKey, exact: true })
      .then(() => queryClient.removeQueries({ queryKey, exact: true }));
  }, [queryClient, queryKey]);

  useEffect(() => {
    const controller = new AbortController();
    const scope = { controller, client };
    const currentLocks = locks.current;
    lifetime.current = scope;
    setDenied(false);
    setPending(new Map());
    setFeedback(null);
    return () => {
      controller.abort();
      lifetime.current = null;
      currentLocks.clear();
      void queryClient.cancelQueries({ queryKey, exact: true }).then(() => {
        const cached = queryClient.getQueryCache().find({ queryKey, exact: true });
        if (cached?.getObserversCount() === 0) queryClient.removeQueries({ queryKey, exact: true });
      });
    };
  }, [client, queryClient, queryKey]);

  useEffect(() => {
    if (isOperationsAccessError(query.error)) deny();
  }, [query.error, deny]);

  let state: JobsState = { kind: "loading" };
  if (denied || isOperationsAccessError(query.error)) state = { kind: "denied" };
  else if (query.data) state = { kind: "ready", jobs: query.data };
  else if (query.isError) state = { kind: "error", error: query.error };

  const refresh = async () => {
    const scope = lifetime.current;
    if (!scope || scope.client !== client || scope.controller.signal.aborted || denied) return;
    try {
      await queryClient.invalidateQueries({ queryKey, exact: true }, { throwOnError: true });
      if (lifetime.current === scope && !scope.controller.signal.aborted)
        setFeedback({ kind: "success", action: "refresh" });
    } catch (error: unknown) {
      if (lifetime.current !== scope || scope.controller.signal.aborted) return;
      setFeedback({ kind: "error", action: "refresh", error });
      if (isOperationsAccessError(error)) deny();
    }
  };

  const run = async (action: OperationsJobAction) => {
    const scope = lifetime.current;
    const job = query.data?.find((entry) => entry.name === action.name);
    if (
      !scope ||
      scope.client !== client ||
      scope.controller.signal.aborted ||
      denied ||
      readOnly ||
      !job ||
      locks.current.has(action.name)
    )
      return;
    if (action.kind === "trigger" && job.preventManualExecution) return;
    if (action.kind === "interval" && (job.preventCustomInterval || !isOperationsCronInterval(action.cron))) return;
    locks.current.add(action.name);
    setPending((previous) => new Map(previous).set(action.name, action.kind));
    setFeedback(null);
    const submission: OperationsSubmission = {
      action: { ...action },
      client: scope.client,
      signal: scope.controller.signal,
      lifetime: scope,
    };
    try {
      switch (action.kind) {
        case "trigger":
          await trigger.mutateAsync(submission);
          break;
        case "enable":
          await enable.mutateAsync(submission);
          break;
        case "disable":
          await disable.mutateAsync(submission);
          break;
        case "start":
          await start.mutateAsync(submission);
          break;
        case "stop":
          await stop.mutateAsync(submission);
          break;
        case "interval":
          await interval.mutateAsync(submission);
          break;
      }
      if (lifetime.current !== scope || scope.controller.signal.aborted) return;
      if (action.kind === "enable" || action.kind === "disable" || action.kind === "interval")
        await queryClient.invalidateQueries({ queryKey, exact: true }, { throwOnError: true });
      if (lifetime.current === scope && !scope.controller.signal.aborted)
        setFeedback({ kind: "success", action: action.kind });
    } catch (error: unknown) {
      if (lifetime.current !== scope || scope.controller.signal.aborted) return;
      setFeedback({ kind: "error", action: action.kind, error });
      if (isOperationsAccessError(error)) deny();
    } finally {
      if (lifetime.current === scope) {
        locks.current.delete(action.name);
        setPending((previous) => {
          const next = new Map(previous);
          next.delete(action.name);
          return next;
        });
      }
    }
  };

  return { state, pending, feedback, refreshing: query.isFetching, refresh: () => void refresh(), run, deny };
}
