import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Notification, Stack } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import type { CreatedIntegration, IntegrationFeatureClient, IntegrationFeaturePrincipal } from "./client";
import { IntegrationOutcomeFeedback } from "./feedback";
import { integrationActionHold } from "../../source-ui/integrations";
import type { IntegrationAction, IntegrationActionAvailabilityMap } from "../../source-ui/integrations";

export interface IntegrationFeatureProviderProps {
  client: IntegrationFeatureClient;
  principal: IntegrationFeaturePrincipal;
  authorityKey: string;
  readOnly: boolean;
  actions?: IntegrationActionAvailabilityMap;
  navigate: (href: string) => void;
  children: ReactNode;
}

interface Notice {
  color: "green" | "red";
  title: string;
  message: string;
}

type IntegrationAcknowledgment =
  | { mode: "create"; result: CreatedIntegration }
  | { mode: "edit"; result: Awaited<ReturnType<IntegrationFeatureClient["integration"]["update"]>> };

interface IntegrationWriteOrigin {
  target: { mode: "create"; kind: CreatedIntegration["integration"]["kind"] } | { mode: "edit"; id: string };
  generation: number;
  isCurrent: () => boolean;
  refresh: () => Promise<boolean>;
}

export interface IntegrationWriteOutcome {
  origin: IntegrationWriteOrigin;
  isScopeCurrent: () => boolean;
  settlement: { state: "dispatched" | "unconfirmed" } | ({ state: "acknowledged" } & IntegrationAcknowledgment);
  refresh: "idle" | "pending" | "complete" | "failed" | "incomplete";
  notification: "idle" | "complete" | "failed" | "retired";
  delivery: "idle" | "entered" | "complete" | "failed" | "retired";
}

interface IntegrationWriteAttempt {
  reject: () => void;
  unconfirmed: () => void;
  acknowledge: (acknowledgment: IntegrationAcknowledgment) => void;
  refresh: () => Promise<void>;
  notification: (state: IntegrationWriteOutcome["notification"]) => void;
  enterDelivery: () => boolean;
  finishDelivery: (state: "complete" | "failed" | "retired") => void;
  complete: () => boolean;
}

interface IntegrationWriteOwner {
  outcome: IntegrationWriteOutcome | null;
  isBlocked: () => boolean;
  begin: (origin: IntegrationWriteOrigin, isScopeCurrent: () => boolean) => IntegrationWriteAttempt | null;
  retryRefresh: () => Promise<void>;
}

interface IntegrationContextValue extends Omit<IntegrationFeatureProviderProps, "children"> {
  notify: (notice: Notice) => void;
  isCurrent: () => boolean;
  isWriteCurrent: () => boolean;
  captureWriteCurrent: (isFormCurrent: () => boolean) => () => boolean;
  writeBlocked: boolean;
  isWriteBlocked: () => boolean;
  beginWrite: (origin: IntegrationWriteOrigin) => IntegrationWriteAttempt | null;
}

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export function IntegrationFeatureProvider(props: IntegrationFeatureProviderProps) {
  const [outcome, setOutcome] = useState<IntegrationWriteOutcome | null>(null);
  const retained = useRef<IntegrationWriteOutcome | null>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    if (retained.current) setOutcome({ ...retained.current });
    return () => {
      mounted.current = false;
    };
  }, []);
  const publish = () => {
    if (mounted.current) setOutcome(retained.current ? { ...retained.current } : null);
  };
  const complete = (receipt: IntegrationWriteOutcome) => {
    const settled =
      receipt.settlement.state === "acknowledged" &&
      receipt.refresh === "complete" &&
      receipt.notification === "complete" &&
      receipt.delivery === "complete";
    if (settled && retained.current === receipt) {
      retained.current = null;
      publish();
    }
    return settled;
  };
  const refresh = async (receipt: IntegrationWriteOutcome) => {
    if (retained.current !== receipt || receipt.refresh === "pending" || !receipt.isScopeCurrent()) return;
    receipt.refresh = "pending";
    publish();
    try {
      const refreshed = await receipt.origin.refresh();
      receipt.refresh = refreshed && receipt.isScopeCurrent() ? "complete" : "incomplete";
    } catch {
      receipt.refresh = "failed";
    }
    publish();
  };
  const writes: IntegrationWriteOwner = {
    outcome,
    isBlocked: () => retained.current !== null,
    begin: (origin, isScopeCurrent) => {
      if (retained.current || !isScopeCurrent() || !origin.isCurrent()) return null;
      const receipt: IntegrationWriteOutcome = {
        origin,
        isScopeCurrent,
        settlement: { state: "dispatched" },
        refresh: "idle",
        notification: "idle",
        delivery: "idle",
      };
      retained.current = receipt;
      publish();
      return {
        reject: () => {
          if (retained.current !== receipt) return;
          retained.current = null;
          publish();
        },
        unconfirmed: () => {
          receipt.settlement = { state: "unconfirmed" };
          publish();
        },
        acknowledge: (acknowledgment) => {
          receipt.settlement = { state: "acknowledged", ...acknowledgment };
          publish();
        },
        refresh: () => refresh(receipt),
        notification: (state) => {
          receipt.notification = state;
          publish();
        },
        enterDelivery: () => {
          if (receipt.delivery !== "idle") return false;
          if (!isScopeCurrent() || !origin.isCurrent()) {
            receipt.delivery = "retired";
            publish();
            return false;
          }
          receipt.delivery = "entered";
          publish();
          return true;
        },
        finishDelivery: (state) => {
          receipt.delivery = state;
          publish();
        },
        complete: () => complete(receipt),
      };
    },
    retryRefresh: async () => {
      const receipt = retained.current;
      if (!receipt || receipt.settlement.state === "dispatched") return;
      await refresh(receipt);
      complete(receipt);
    },
  };
  const userId = props.principal.kind === "authenticated" ? props.principal.user.id : "anonymous";
  return <IntegrationFeatureScope key={`${userId}:${props.authorityKey}`} {...props} writes={writes} />;
}

function IntegrationFeatureScope({
  children,
  writes,
  ...props
}: IntegrationFeatureProviderProps & { writes: IntegrationWriteOwner }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const active = useRef(true);
  const latest = useRef(props);
  latest.current = props;
  const isWriteCurrent = () =>
    active.current &&
    latest.current.client === props.client &&
    latest.current.principal === props.principal &&
    latest.current.authorityKey === props.authorityKey &&
    latest.current.actions === props.actions &&
    latest.current.readOnly === props.readOnly;
  const queryClient = useQueryClient();
  const userId = props.principal.kind === "authenticated" ? props.principal.user.id : "anonymous";
  useLayoutEffect(() => {
    active.current = true;
    const queryKeys = [
      ["native", props.authorityKey, userId, "integration"],
      ["native", props.authorityKey, userId, "widget"],
    ];
    return () => {
      active.current = false;
      for (const queryKey of queryKeys) {
        void queryClient.cancelQueries({ queryKey });
        queryClient.removeQueries({ queryKey });
      }
    };
  }, [queryClient, props.authorityKey, userId]);
  return (
    <IntegrationContext.Provider
      value={{
        ...props,
        isCurrent: () => active.current,
        isWriteCurrent,
        captureWriteCurrent: (isFormCurrent) => () => isWriteCurrent() && isFormCurrent(),
        writeBlocked: writes.outcome !== null,
        isWriteBlocked: writes.isBlocked,
        beginWrite: (origin) => {
          const action = origin.target.mode === "create" ? "create" : "update";
          if (
            !isWriteCurrent() ||
            props.readOnly ||
            props.principal.kind !== "authenticated" ||
            props.actions?.[action]?.state !== "available" ||
            (action === "create" && !props.principal.user.permissions.includes("integration-create"))
          )
            return null;
          return writes.begin(origin, isWriteCurrent);
        },
        notify: (next) => {
          if (active.current) setNotice(next);
        },
      }}
    >
      <Stack>
        {notice && (
          <Notification color={notice.color} title={notice.title} onClose={() => setNotice(null)} role="status">
            {notice.message}
          </Notification>
        )}
        {writes.outcome && (
          <IntegrationOutcomeFeedback outcome={writes.outcome} retry={() => void writes.retryRefresh()} />
        )}
        {children}
      </Stack>
    </IntegrationContext.Provider>
  );
}

export function useIntegrationFeature() {
  const context = useContext(IntegrationContext);
  if (!context) throw new Error("IntegrationFeatureProvider is required");
  return context;
}

export function useIntegrationAction(action: IntegrationAction) {
  const { actions, readOnly } = useIntegrationFeature();
  if (readOnly) return { state: "held", reason: "Integration actions are unavailable in read-only mode." } as const;
  return actions?.[action] ?? integrationActionHold;
}

export function useIntegrationQueryKey() {
  const { authorityKey, principal } = useIntegrationFeature();
  const userId = principal.kind === "authenticated" ? principal.user.id : "anonymous";
  return ["native", authorityKey, userId, "integration"] as const;
}

export function useInvalidateIntegrations(target: "integration" | "apps" = "integration", observeFailures = false) {
  const queryClient = useQueryClient();
  const key = useIntegrationQueryKey();
  const { isCurrent: isAuthorityCurrent, isWriteCurrent } = useIntegrationFeature();
  const queryKeys: (readonly unknown[])[] =
    target === "apps" ? [[...key, "apps"]] : [key, ["native", key[1], key[2], "widget"]];
  return async () => {
    const retire = async () => {
      await Promise.all(queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      for (const queryKey of queryKeys) queryClient.removeQueries({ queryKey });
    };
    if (!isAuthorityCurrent()) {
      await retire();
      return false;
    }
    if (!observeFailures) {
      await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (!isAuthorityCurrent()) await retire();
      return false;
    }
    if (!isWriteCurrent()) return false;
    const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys[0], type: "active" });
    const observed = queryKeys.flatMap((queryKey) =>
      queryClient
        .getQueryCache()
        .findAll({ queryKey, type: "active" })
        .filter((query) => !query.isDisabled() && !query.isStatic())
        .map((query) => ({ query, updates: query.state.dataUpdateCount })),
    );
    const results = await Promise.allSettled(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }, { throwOnError: true })),
    );
    if (!isAuthorityCurrent()) {
      await retire();
      return false;
    }
    if (!isWriteCurrent()) return false;
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
    return (
      queries.some((query) => observed.some((entry) => entry.query === query)) &&
      observed.every(
        ({ query, updates }) =>
          queryClient.getQueryCache().get(query.queryHash) === query &&
          query.state.dataUpdateCount > updates &&
          query.state.status === "success" &&
          query.state.fetchStatus === "idle" &&
          !query.state.isInvalidated,
      )
    );
  };
}
