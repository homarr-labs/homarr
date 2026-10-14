import type { QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

interface SessionTransition {
  generation: number;
  blocked: boolean;
  running: boolean;
  managed: boolean;
  listeners: Set<() => void>;
}

const transitions = new WeakMap<QueryClient, SessionTransition>();

function transitionFor(queryClient: QueryClient): SessionTransition {
  let transition = transitions.get(queryClient);
  if (!transition) {
    transition = { generation: 0, blocked: false, running: false, managed: false, listeners: new Set() };
    transitions.set(queryClient, transition);
  }
  return transition;
}

function notifyTransition(queryClient: QueryClient, blocked: boolean): void {
  const transition = transitionFor(queryClient);
  if (transition.blocked === blocked) return;
  transition.blocked = blocked;
  for (const listener of transition.listeners) listener();
}

export function beginSessionTransition(queryClient: QueryClient): void {
  const transition = transitionFor(queryClient);
  if (transition.generation >= Number.MAX_SAFE_INTEGER - 1) {
    transition.generation = Number.MAX_SAFE_INTEGER;
    transition.managed = true;
    notifyTransition(queryClient, true);
    throw new RangeError("Fixture session transition generation exhausted");
  }
  transition.generation += 1;
  notifyTransition(queryClient, true);
}

export function captureSessionTransition(queryClient: QueryClient): number | null {
  const transition = transitionFor(queryClient);
  return transition.blocked || transition.running ? null : transition.generation;
}

export function isSessionTransitionCurrent(queryClient: QueryClient, epoch: number): boolean {
  const transition = transitionFor(queryClient);
  return transition.generation === epoch && !transition.blocked && !transition.running;
}

export function invalidateSessionTransition(queryClient: QueryClient, capturedEpoch: number): void {
  if (!isSessionTransitionCurrent(queryClient, capturedEpoch)) return;
  beginSessionTransition(queryClient);
}

export function completeSessionTransition(queryClient: QueryClient): void {
  if (transitionFor(queryClient).managed) return;
  notifyTransition(queryClient, false);
}

export class SessionTransitionBusyError extends Error {
  constructor() {
    super("Another fixture session transition is in progress");
  }
}

export async function runSessionTransition(queryClient: QueryClient, operation: () => Promise<void>): Promise<void> {
  const transition = transitionFor(queryClient);
  if (transition.running) throw new SessionTransitionBusyError();
  const generation = transition.generation;
  transition.running = true;
  transition.managed = true;
  try {
    beginSessionTransition(queryClient);
    await operation();
    if (transition.generation === generation + 1) notifyTransition(queryClient, false);
  } finally {
    transition.running = false;
  }
}

export function useSessionTransition(queryClient: QueryClient): boolean {
  const transition = transitionFor(queryClient);
  return useSyncExternalStore(
    (listener) => {
      transition.listeners.add(listener);
      return () => transition.listeners.delete(listener);
    },
    () => transition.blocked,
    () => false,
  );
}
