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
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(false);
  const client = useRef<PocketBase | null>(null);
  useEffect(() => {
    let active = true;
    void request<AuthConfig>("/api/auth/config")
      .then((value) => {
        if (!active) return;
        setConfig(value);
        client.current = new PocketBase(value.workshopApiUrl);
        setExisting(client.current.authStore.isValid);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [request]);
  const signIn = () => {
    const pb = client.current;
    if (!config || !pb) return;
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
        setError(errorMessage(cause));
        setExisting(pb.authStore.isValid);
      })
      .finally(() => setBusy(false));
  };
  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      await request("/auth/logout", { method: "POST" });
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack>
      {session.user ? (
        <Group justify="space-between">
          <div>
            <Text fw={600}>{session.user.name || session.user.login}</Text>
            <Text c="dimmed" size="sm">
              Your Homarr account
            </Text>
          </div>
          <Button variant="default" onClick={() => void signOut()} loading={busy}>
            Sign out of account
          </Button>
        </Group>
      ) : (
        <>
          <Text c="dimmed">
            Use your Homarr account to organize workers and invite people. Worker access is approved separately on each
            worker.
          </Text>
          <Button leftSection={<IconBrandGithub size={18} />} onClick={signIn} disabled={!config} loading={busy}>
            {existing ? "Continue with your Homarr account" : "Continue with GitHub"}
          </Button>
        </>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
