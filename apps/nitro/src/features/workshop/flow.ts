import { useLayoutEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { useWorkshopFeature } from "./scope";

interface WorkshopFlowGeneration {
  owner: { readonly identity: string };
  active: boolean;
  operation: symbol | null;
  controllers: Set<AbortController>;
}

export interface WorkshopFlowLease {
  signal: AbortSignal;
  isCurrent(): boolean;
  assertCurrent(): void;
  release(): void;
}

function useWorkshopFlow(identity: string, recipient: unknown) {
  const { client, principal, authorityKey, readOnly, transport, onDefinitionsChanged } = useWorkshopFeature();
  const generation = useRef<WorkshopFlowGeneration | null>(null);
  const userId = principal.kind === "authenticated" ? principal.user.id : "anonymous";
  const permissions = JSON.stringify(principal.kind === "authenticated" ? principal.user.permissions : []);
  const transportAuthority = transport.kind === "available" ? transport.authorityKey : "held";
  const transportClient = transport.kind === "available" ? transport.client : null;
  const transportUserId = transportClient?.currentUser?.id;

  const owner = useMemo(
    () => ({
      identity,
      recipient,
      client,
      userId,
      permissions,
      authorityKey,
      readOnly,
      transportAuthority,
      transportClient,
      transportUserId,
      onDefinitionsChanged,
    }),
    [
      identity,
      recipient,
      client,
      userId,
      permissions,
      authorityKey,
      readOnly,
      transportAuthority,
      transportClient,
      transportUserId,
      onDefinitionsChanged,
    ],
  );

  useLayoutEffect(() => {
    const mounted: WorkshopFlowGeneration = { owner, active: true, operation: null, controllers: new Set() };
    generation.current = mounted;
    return () => {
      mounted.active = false;
      for (const controller of mounted.controllers) controller.abort();
      mounted.controllers.clear();
      if (generation.current === mounted) generation.current = null;
    };
  }, [owner]);

  return () => {
    const mounted = generation.current;
    if (!mounted?.active || mounted.owner !== owner) throw new Error("Workshop flow is no longer mounted");
    for (const controller of mounted.controllers) controller.abort();
    mounted.controllers.clear();
    const controller = new AbortController();
    const operation = Symbol();
    mounted.operation = operation;
    mounted.controllers.add(controller);
    const isCurrent = () =>
      mounted.active &&
      generation.current === mounted &&
      mounted.operation === operation &&
      !controller.signal.aborted &&
      transportClient?.currentUser?.id === transportUserId;
    return {
      signal: controller.signal,
      isCurrent,
      assertCurrent: () => {
        if (!isCurrent()) throw new Error("Workshop flow was superseded");
      },
      release: () => mounted.controllers.delete(controller),
    } satisfies WorkshopFlowLease;
  };
}

export function useWorkshopMutation<TInput, TResult>({
  identity,
  recipient,
  mutationFn,
  onSuccess,
}: {
  identity: string;
  recipient?: unknown;
  mutationFn(input: TInput, lease: WorkshopFlowLease): Promise<TResult>;
  onSuccess?(result: TResult, lease: WorkshopFlowLease): void;
}) {
  const begin = useWorkshopFlow(identity, recipient);
  const mutation = useMutation({
    mutationFn: ({ input, lease }: { input: TInput; lease: WorkshopFlowLease }) => {
      lease.assertCurrent();
      return mutationFn(input, lease);
    },
    onSuccess: (result, { lease }) => {
      if (lease.isCurrent()) onSuccess?.(result, lease);
    },
    onSettled: (_result, _error, { lease }) => lease.release(),
    retry: false,
  });
  return { ...mutation, mutate: (input: TInput) => mutation.mutate({ input, lease: begin() }) };
}
