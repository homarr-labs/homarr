import { Alert, Button, Skeleton, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type {
  AssistantAccess,
  AssistantDomain,
  AssistantFeatureClient,
  AssistantFeatureCopy,
  AssistantGenerationBinding,
  AssistantTranslate,
} from "./client";

export interface AssistantFeatureProps {
  readonly client: AssistantFeatureClient;
  readonly access: AssistantAccess;
  readonly domain: AssistantDomain;
  readonly generation: AssistantGenerationBinding;
  readonly t: AssistantTranslate;
  readonly copy: AssistantFeatureCopy;
  readonly clientContext: { readonly pathname: string; readonly timeZone?: string };
  readonly children: ReactNode;
}

type AssistantFeatureValue = Omit<AssistantFeatureProps, "access" | "children"> & {
  readonly access: Extract<AssistantAccess, { kind: "authenticated" }>;
  readonly queryKey: readonly string[];
};

const AssistantFeatureContext = createContext<AssistantFeatureValue | null>(null);

export function AssistantFeatureBoundary(props: AssistantFeatureProps) {
  const [revoked, setRevoked] = useState<AbortSignal | null>(null);
  const queryClient = useQueryClient();
  const access = props.access;
  const scope = access.kind === "authenticated" ? access.cacheScope : null;
  const userId = access.kind === "authenticated" ? access.principal.user.id : null;
  const signal = access.kind === "authenticated" ? access.signal : null;

  useEffect(() => {
    if (!signal || !scope || !userId) return;
    const queryKey = ["assistant", scope, userId];
    const expire = () => {
      setRevoked(signal);
      void queryClient.cancelQueries({ queryKey }).then(() => queryClient.removeQueries({ queryKey }));
    };
    signal.addEventListener("abort", expire, { once: true });
    if (signal.aborted) expire();
    return () => {
      signal.removeEventListener("abort", expire);
      void queryClient.cancelQueries({ queryKey }).then(() => queryClient.removeQueries({ queryKey }));
    };
  }, [queryClient, scope, signal, userId]);

  if (access.kind === "held") {
    return <Alert title={props.t("assistant.unavailable.signIn")}>{access.reason}</Alert>;
  }
  if (access.signal.aborted || revoked === access.signal || !access.cacheScope) {
    return <Alert>{props.t("assistant.unavailable.signIn")}</Alert>;
  }

  return (
    <AssistantFeatureContext.Provider
      key={`${access.cacheScope}:${access.principal.user.id}`}
      value={{ ...props, access, queryKey: ["assistant", access.cacheScope, access.principal.user.id] }}
    >
      {props.children}
    </AssistantFeatureContext.Provider>
  );
}

export function useAssistantFeature() {
  const feature = useContext(AssistantFeatureContext);
  if (!feature) throw new Error("AssistantFeatureBoundary is required");
  return feature;
}

export function AssistantLoading() {
  return (
    <Stack aria-busy="true">
      <Skeleton h={20} w="60%" />
      <Skeleton h={64} />
      <Skeleton h={64} />
    </Stack>
  );
}

export function AssistantError({ retry, message }: { readonly retry?: () => void; readonly message?: string }) {
  const { t } = useAssistantFeature();
  return (
    <Alert color="red" title={t("assistant.responseError.title")}>
      <Stack gap="sm">
        <Text size="sm">{message ?? t("assistant.responseError.description")}</Text>
        {retry && (
          <Button variant="default" onClick={retry}>
            {t("common.action.tryAgain")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function useAssistantAction() {
  const { access } = useAssistantFeature();
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");
  const [lock] = useState(() => ({ active: false }));
  const execute = async (action: () => Promise<void>) => {
    if (lock.active || access.signal.aborted || access.readOnly) return false;
    lock.active = true;
    setState("pending");
    try {
      await action();
      if (!access.signal.aborted) setState("idle");
      return !access.signal.aborted;
    } catch {
      if (!access.signal.aborted) setState("failed");
      return false;
    } finally {
      lock.active = false;
    }
  };
  return { execute, pending: state === "pending", failed: state === "failed", reset: () => setState("idle") };
}
