import { Alert, Stack, Text } from "@mantine/core";
import { ORPCError } from "@orpc/client";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CertificateUiScope } from "./contracts";
import { canWriteCertificates } from "./contracts";

type Feedback =
  | { readonly kind: "success"; readonly title: string; readonly message: string }
  | {
      readonly kind: "failed";
      readonly title: string;
      readonly message: string;
      readonly code: string | undefined;
      readonly uncertain: boolean;
    }
  | { readonly kind: "refreshFailed" };

interface MutationState {
  readonly lifetime: object;
  readonly pending: boolean;
  readonly feedback: Feedback | undefined;
}

export function useCertificateMutation(scope: CertificateUiScope, targetKey: string) {
  const latest = useRef(scope);
  latest.current = scope;
  const lifetime = useMemo(
    () => ({
      authorityKey: scope.authorityKey,
      client: scope.client,
      signal: scope.signal,
      targetKey,
      controller: new AbortController(),
      busy: false,
      blocked: false,
    }),
    [scope.authorityKey, scope.client, scope.signal, targetKey],
  );
  const latestLifetime = useRef(lifetime);
  latestLifetime.current = lifetime;
  const [state, setState] = useState<MutationState>({ lifetime, pending: false, feedback: undefined });

  useEffect(() => {
    if (lifetime.controller.signal.aborted) lifetime.controller = new AbortController();
    return () => lifetime.controller.abort();
  }, [lifetime]);

  const retained = () =>
    !lifetime.controller.signal.aborted &&
    latestLifetime.current === lifetime &&
    !scope.signal.aborted &&
    latest.current.authorityKey === scope.authorityKey &&
    latest.current.signal === scope.signal &&
    latest.current.client === scope.client;

  const current = () => retained() && canWriteCertificates(latest.current);

  function settleUnavailableCompletion() {
    if (!retained()) return;
    lifetime.blocked = true;
    setState({ lifetime, pending: false, feedback: { kind: "refreshFailed" } });
  }

  async function run(
    operation: (signal: AbortSignal) => Promise<unknown>,
    notificationKey: string,
    onSuccess: () => void | Promise<void>,
  ): Promise<boolean> {
    if (!current() || lifetime.busy || lifetime.blocked) return false;
    const signal = AbortSignal.any([scope.signal, lifetime.controller.signal]);
    const operationCurrent = () => current() && !signal.aborted;
    lifetime.busy = true;
    setState({ lifetime, pending: true, feedback: undefined });
    try {
      await operation(signal);
    } catch (error: unknown) {
      if (retained()) {
        const code = error instanceof ORPCError ? error.code : undefined;
        const data: unknown = error instanceof ORPCError ? error.data : undefined;
        const mutationMayHaveCompleted =
          typeof data === "object" && data !== null && "mutationMayHaveCompleted" in data
            ? data.mutationMayHaveCompleted
            : undefined;
        const uncertain =
          mutationMayHaveCompleted === true ||
          (code === "CERTIFICATE_OPERATION_FAILED"
            ? mutationMayHaveCompleted !== false
            : code !== "BAD_REQUEST" &&
              code !== "CONFLICT" &&
              code !== "FORBIDDEN" &&
              code !== "UNAUTHORIZED" &&
              code !== "PRECONDITION_FAILED");
        lifetime.blocked = uncertain;
        setState({
          lifetime,
          pending: false,
          feedback: {
            kind: "failed",
            title: scope.t(`${notificationKey}.error.title`),
            message: scope.t(`${notificationKey}.error.message`),
            code,
            uncertain,
          },
        });
        lifetime.busy = false;
        if (operationCurrent()) {
          scope.notify?.({
            kind: "failed",
            title: scope.t(`${notificationKey}.error.title`),
            message: scope.t(`${notificationKey}.error.message`),
          });
        }
      }
      lifetime.busy = false;
      return false;
    }
    if (!operationCurrent()) {
      settleUnavailableCompletion();
      lifetime.busy = false;
      return false;
    }
    try {
      scope.notify?.({
        kind: "success",
        title: scope.t(`${notificationKey}.success.title`),
        message: scope.t(`${notificationKey}.success.message`),
      });
      await onSuccess();
    } catch {
      lifetime.blocked = true;
      if (retained()) setState({ lifetime, pending: false, feedback: { kind: "refreshFailed" } });
      lifetime.busy = false;
      return false;
    }
    lifetime.busy = false;
    if (operationCurrent()) {
      setState({
        lifetime,
        pending: false,
        feedback: {
          kind: "success",
          title: scope.t(`${notificationKey}.success.title`),
          message: scope.t(`${notificationKey}.success.message`),
        },
      });
    } else {
      settleUnavailableCompletion();
    }
    return operationCurrent();
  }

  return {
    run,
    pending: state.lifetime === lifetime && state.pending,
    blocked: lifetime.blocked || !canWriteCertificates(scope),
    feedback: state.lifetime === lifetime ? state.feedback : undefined,
  };
}

export function CertificateWriteUnavailable({ scope }: { readonly scope: CertificateUiScope }) {
  if (canWriteCertificates(scope)) return null;
  let message = "Secure certificate writes are unavailable in this runtime. No trust changes will be submitted.";
  if (scope.writes?.kind === "unavailable") message = scope.writes.reason;
  return (
    <Alert color="yellow" role="alert">
      {message}
    </Alert>
  );
}

export function CertificateMutationFeedback({ feedback }: { feedback: Feedback | undefined }) {
  if (!feedback) return null;
  if (feedback.kind === "refreshFailed") {
    return (
      <Alert color="yellow" role="alert">
        The mutation completed, but the view could not be refreshed. Reload and inspect the current trust state before
        continuing.
      </Alert>
    );
  }
  return (
    <Alert
      color={feedback.kind === "success" ? "green" : "red"}
      title={feedback.title}
      role={feedback.kind === "success" ? "status" : "alert"}
    >
      <Stack gap="xs">
        <Text size="sm">{feedback.message}</Text>
        {feedback.kind === "failed" && feedback.code && <Text size="sm">{feedback.code}</Text>}
        {feedback.kind === "failed" && feedback.uncertain && (
          <Text size="sm">
            The mutation may have completed. Reload and inspect the current trust state before repeating it.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}
