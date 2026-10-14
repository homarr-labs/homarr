import { useEffect, useRef, useState } from "react";
import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";

import { extractErrorMessage } from "../../../../../packages/common/src/error";
import { useIdentity } from "./boundary";

export function IdentityDenied() {
  return (
    <Alert component="output" aria-live="polite" title="Access unavailable">
      This identity requires administrator or self access.
    </Alert>
  );
}

export function IdentityLoading() {
  return (
    <Stack component="output" aria-live="polite" aria-label="Loading identity data">
      <Skeleton h={40} />
      <Skeleton h={100} />
    </Stack>
  );
}

export function IdentityError({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Alert color="red" title="Identity request failed" role="alert">
      <Stack gap="xs">
        <Text style={{ overflowWrap: "anywhere" }}>{extractErrorMessage(error)}</Text>
        {retry && (
          <Button variant="default" onClick={retry}>
            Retry request
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function useIdentityAction() {
  const scope = useIdentity();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshError, setRefreshError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const active = useRef(true);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  async function run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    options: { refreshAuthority?: boolean; onSuccess?: (value: T) => void } = {},
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    if (running.current || !active.current || !scope.isCurrent()) return { ok: false };
    if (scope.demo.enabled && scope.demo.readOnly) {
      setError(new Error("Mutations are disabled in demo mode"));
      return { ok: false };
    }
    running.current = true;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setSaved(false);
    setError(null);
    setRefreshError(null);
    try {
      const value = await operation(request.signal);
      if (!active.current || !scope.isCurrent() || request.signal.aborted) return { ok: false };
      if (options.refreshAuthority) {
        scope.retire();
        try {
          await scope.refreshAuthority();
        } catch {
          scope.retire(
            "The mutation completed, but the host could not refresh authority. Identity data remains hidden. Do not repeat the mutation to refresh the screen.",
          );
        }
        return { ok: false };
      }
      setSaved(true);
      options.onSuccess?.(value);
      try {
        await scope.queryClient.invalidateQueries();
      } catch (cause) {
        if (active.current && scope.isCurrent() && !request.signal.aborted) setRefreshError(cause);
      }
      if (!active.current || !scope.isCurrent() || request.signal.aborted) return { ok: false };
      return { ok: true, value };
    } catch (cause) {
      if (active.current && scope.isCurrent() && !request.signal.aborted) {
        setError(cause);
      }
      return { ok: false };
    } finally {
      running.current = false;
      if (active.current && scope.isCurrent()) setPending(false);
    }
  }

  return {
    run,
    pending,
    error,
    refreshError,
    saved,
    clear: () => {
      setError(null);
      setRefreshError(null);
      setSaved(false);
    },
  };
}

export function ActionFeedback({ action }: { action: ReturnType<typeof useIdentityAction> }) {
  if (action.error) return <IdentityError error={action.error} />;
  if (!action.saved && !action.refreshError) return null;
  return (
    <Stack gap="xs">
      {action.saved && (
        <Text component="output" aria-live="polite">
          Changes saved.
        </Text>
      )}
      {Boolean(action.refreshError) && <IdentityError error={action.refreshError} />}
    </Stack>
  );
}

export function ConfirmIdentityAction({
  label,
  disabled = false,
  execute,
  refreshAuthority = false,
}: {
  label: string;
  disabled?: boolean;
  execute: (signal: AbortSignal) => Promise<unknown>;
  refreshAuthority?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const { demo } = useIdentity();
  const action = useIdentityAction();
  return (
    <Stack gap="xs">
      <Group>
        {!confirming ? (
          <Button
            color="red"
            variant="subtle"
            disabled={disabled || (demo.enabled && demo.readOnly)}
            onClick={() => setConfirming(true)}
          >
            {label}
          </Button>
        ) : (
          <>
            <Text>Confirm {label.toLowerCase()}?</Text>
            <Button variant="default" disabled={action.pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              disabled={disabled || (demo.enabled && demo.readOnly)}
              loading={action.pending}
              onClick={async () => {
                const result = await action.run(execute, { refreshAuthority });
                if (result.ok) setConfirming(false);
              }}
            >
              {label}
            </Button>
          </>
        )}
      </Group>
      <ActionFeedback action={action} />
    </Stack>
  );
}
