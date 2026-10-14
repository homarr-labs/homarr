import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { IdentityId, SessionState } from "../../contracts/schemas";
import type { SessionSlotProps } from "../../contracts/ui";
import { runSessionTransition, SessionTransitionBusyError, useSessionTransition } from "./session-transition";

const sessionQueryKey = ["fixture-session", "current"] as const;

function identityKey(state: SessionState): string {
  return state.status === "authenticated" ? state.identity.id : "anonymous";
}

export function SessionControls({ client, queryClient, onSessionChanged }: SessionSlotProps) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<IdentityId>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const lastIdentity = useRef<string | null>(null);
  const blocked = useSessionTransition(queryClient);
  const session = useQuery(
    {
      queryKey: sessionQueryKey,
      queryFn: ({ signal }) => client.session.current({}, { signal }),
      enabled: mounted && !busy && !blocked,
      retry: false,
      staleTime: 0,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
    queryClient,
  );

  useEffect(() => setMounted(true), []);

  const runTransition = useCallback(
    async (operation: () => Promise<SessionState>) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setError(null);
      let changed = false;
      try {
        await runSessionTransition(queryClient, async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          const next = await operation();
          changed = true;
          lastIdentity.current = identityKey(next);
          await queryClient.cancelQueries();
          queryClient.clear();
          queryClient.setQueryData(sessionQueryKey, next);
          await onSessionChanged();
        });
      } catch (cause) {
        setError(
          cause instanceof SessionTransitionBusyError
            ? "Another session check is in progress. No new session change was started. Retry when it finishes."
            : changed
              ? "Session confirmed, but the board could not refresh. Content stays hidden. Refresh access or select a fixture user to retry."
              : "Session change could not be confirmed. Content stays hidden. Refresh access before continuing.",
        );
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [queryClient, onSessionChanged],
  );

  useEffect(() => {
    if (!mounted || running.current || !session.data || !session.isFetchedAfterMount) return;
    const next = identityKey(session.data);
    if (lastIdentity.current === null || lastIdentity.current !== next) {
      const state = session.data;
      void runTransition(() => Promise.resolve(state));
    } else {
      lastIdentity.current = next;
    }
  }, [mounted, session.data, session.isFetchedAfterMount, runTransition]);

  useEffect(() => {
    if (!mounted || busy || blocked || session.data?.status !== "authenticated") return;
    const remaining = Math.max(0, Date.parse(session.data.expiresAt) - Date.now());
    const timeout = window.setTimeout(() => {
      void runTransition(() => client.session.current({}));
    }, remaining + 1);
    return () => window.clearTimeout(timeout);
  }, [mounted, busy, blocked, session.data, client, runTransition]);

  useEffect(() => {
    if (!mounted || !session.isError || running.current) return;
    void runTransition(async () => {
      throw new Error("Fixture session status unavailable");
    });
  }, [mounted, session.isError, runTransition]);

  const state = mounted ? session.data : undefined;
  const current =
    busy || blocked
      ? "Access hidden while session is checked"
      : state?.status === "authenticated"
        ? `${state.identity.label}, session lasts up to 15 minutes`
        : state?.status === "anonymous"
          ? "Anonymous: public board only"
          : "Checking fixture session…";

  return (
    <Stack gap="xs" component="section" aria-label="Fixture session">
      <Text size="sm" fw={600}>
        Synthetic identities only. Local experiment, not production authentication.
      </Text>
      <Text size="sm" role="status" aria-live="polite">
        {current}
      </Text>
      <Group align="end" wrap="wrap" gap="sm">
        <Select<IdentityId>
          label="Fixture identity"
          description="Owner: both boards and edits. Viewer: public reads only."
          data={[
            { value: "owner", label: "Fixture owner" },
            { value: "viewer", label: "Fixture viewer" },
          ]}
          value={selected}
          allowDeselect={false}
          disabled={!mounted || busy}
          onChange={(value) => {
            if (value === "owner" || value === "viewer") setSelected(value);
          }}
          style={{ flex: "1 1 240px" }}
        />
        <Button
          disabled={!mounted || busy}
          loading={busy}
          onClick={() => {
            void runTransition(() => client.session.select({ identityId: selected }));
          }}
        >
          Select identity
        </Button>
        <Button
          variant="default"
          disabled={!mounted || busy || (!blocked && state?.status !== "authenticated")}
          onClick={() => {
            void runTransition(async () => {
              await client.session.logout({});
              return { status: "anonymous", fixtureOnly: true };
            });
          }}
        >
          Log out
        </Button>
        {(blocked || error) && (
          <Button
            variant="default"
            disabled={busy}
            onClick={() => {
              void runTransition(() => client.session.current({}));
            }}
          >
            Refresh access
          </Button>
        )}
      </Group>
      {error && (
        <Text size="sm" c="red.9" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
