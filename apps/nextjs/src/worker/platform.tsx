"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import PocketBase from "pocketbase";

import type { PlatformSession } from "@homarr/remote-platform/types";

import { useWorkerWorkspace } from "./context";

type PlatformRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
interface PlatformAccount {
  session: PlatformSession;
  request: PlatformRequest;
  refresh: () => Promise<void>;
}
const PlatformContext = createContext<PlatformAccount | null>(null);
const anonymousSession: PlatformSession = { user: null, csrfToken: null };

export const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Unable to complete this request.";

export function PlatformAccountProvider({ children }: PropsWithChildren) {
  const { platformPath } = useWorkerWorkspace();
  const [session, setSession] = useState<PlatformSession>(anonymousSession);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const request = useCallback<PlatformRequest>(
    async (path, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Accept", "application/json");
      if (init?.body) headers.set("Content-Type", "application/json");
      if (!headers.has("X-CSRF-Token") && sessionRef.current.csrfToken)
        headers.set("X-CSRF-Token", sessionRef.current.csrfToken);
      const response = await fetch(`${platformPath.replace(/\/$/, "")}${path}`, {
        ...init,
        headers,
        credentials: "same-origin",
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (body && typeof body === "object" && "error" in body && typeof body.error === "string")
          throw new Error(body.error);
        throw new Error(
          `Account service is unavailable (${response.status}). Your saved worker connections still work.`,
        );
      }
      return body as never;
    },
    [platformPath],
  );
  const refresh = useCallback(async () => {
    const result = await request<PlatformSession>("/api/session");
    setSession(result);
  }, [request]);
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);
  const value = useMemo(() => ({ session, request, refresh }), [session, request, refresh]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatformAccount() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("A Homarr account provider is required");
  return context;
}

interface AuthConfig {
  workshopApiUrl: string;
  authCollection: string;
  provider: string;
  csrfToken: string;
}

export function WorkerAccount() {
  const { session, request, refresh } = usePlatformAccount();
  const accountUserId = session.user?.id;
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(false);
  const [retry, setRetry] = useState(0);
  const client = useRef<PocketBase | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (accountUserId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void request<AuthConfig>("/api/auth/config", { signal: controller.signal })
      .then((value) => {
        if (!mounted.current || controller.signal.aborted) return;
        setConfig(value);
        client.current = new PocketBase(value.workshopApiUrl);
        setExisting(client.current.authStore.isValid);
      })
      .catch((cause) => {
        if (mounted.current && !controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (mounted.current && !controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request, retry, accountUserId]);

  function signIn() {
    const pb = client.current;
    if (!config || !pb || busy) return;
    setBusy(true);
    setError("");
    let authorization: Promise<unknown>;
    if (existing) authorization = pb.collection(config.authCollection).authRefresh();
    else authorization = pb.collection(config.authCollection).authWithOAuth2({ provider: config.provider });
    void authorization
      .then(async () => {
        await request("/auth/workshop/session", {
          method: "POST",
          headers: { "X-CSRF-Token": config.csrfToken },
          body: JSON.stringify({ token: pb.authStore.token }),
        });
        await refresh();
      })
      .catch((cause) => {
        if (mounted.current) {
          setError(errorMessage(cause));
          setExisting(false);
        }
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/auth/logout", { method: "POST" });
      await refresh();
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  let signInLabel = "Continue with GitHub";
  if (existing) signInLabel = "Continue with your Homarr account";
  let content = (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Sign in to your Homarr cloud account to enable hosted MCP. Your dashboards and local users work without a cloud
        account.
      </Text>
      <Group gap="sm">
        <Button
          leftSection={<IconBrandGithub size={18} />}
          onClick={signIn}
          disabled={!config || loading}
          loading={busy}
        >
          {signInLabel}
        </Button>
        {error && !config && (
          <Button variant="default" onClick={() => setRetry((value) => value + 1)} disabled={loading}>
            Retry
          </Button>
        )}
      </Group>
    </Stack>
  );
  if (session.user)
    content = (
      <Group justify="space-between" gap="sm">
        <div>
          <Text size="sm" fw={500}>
            {session.user.name || session.user.login}
          </Text>
          <Text size="xs" c="dimmed">
            Homarr cloud account
          </Text>
        </div>
        <Button variant="subtle" size="sm" onClick={() => void signOut()} loading={busy}>
          Sign out
        </Button>
      </Group>
    );
  return (
    <Stack gap="md">
      {content}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
