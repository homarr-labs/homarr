"use client";

import type { Context, Dispatch, PropsWithChildren, SetStateAction } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { hashKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  WidgetCommand,
  WidgetHostContext,
  WidgetHostServices,
  WidgetStateStore,
  WidgetStorageScope,
} from "./shared";

export type * from "./shared";
export { parseLocalWidgetState, serializeLocalWidgetState, useLocalWidgetState } from "./local-state";

interface WidgetRuntime {
  context: WidgetHostContext;
  services: WidgetHostServices;
  options: Record<string, unknown>;
}

// The authorized module loader and Next route chunks must share one context even after HMR.
// Compiled package modules can outlive the chunk that originally supplied their SDK hooks.
const contextKey = Symbol.for("homarr.widget.context.v1");
const contextRegistry = globalThis as typeof globalThis & { [contextKey]?: Context<WidgetRuntime | null> };
const WidgetContext = (contextRegistry[contextKey] ??= createContext<WidgetRuntime | null>(null));

export function WidgetHostProvider({ children, ...runtime }: PropsWithChildren<WidgetRuntime>) {
  return <WidgetContext.Provider value={runtime}>{children}</WidgetContext.Provider>;
}

/** Compose independently authored components without colliding state, storage, commands or query caches. */
export function WidgetScope({
  name,
  handlerPrefix = "",
  options,
  children,
}: PropsWithChildren<{
  name: string;
  handlerPrefix?: string;
  options?: Record<string, unknown>;
}>) {
  const runtime = useWidgetRuntime();
  const parent = runtime.services;
  const services = useMemo<WidgetHostServices>(() => {
    const operation = (input: Parameters<WidgetHostServices["transport"]["query"]>[0]) => ({
      ...input,
      name: input.name.startsWith("$") ? input.name : `${handlerPrefix}${input.name}`,
    });
    return {
      ...parent,
      state: {
        get: (key) => parent.state.get(`${name}:${key}`),
        set: (key, value) => parent.state.set(`${name}:${key}`, value),
        subscribe: parent.state.subscribe,
      },
      registerCommands: (commands) =>
        parent.registerCommands(commands.map((command) => ({ ...command, id: `${name}:${command.id}` }))),
      transport: {
        query: (input, signal) => parent.transport.query(operation(input), signal),
        action: (input) => parent.transport.action(operation(input)),
        subscribe: (input, observer) => parent.transport.subscribe(operation(input), observer),
        storageGet: (input, signal) => parent.transport.storageGet({ ...input, key: `${name}:${input.key}` }, signal),
        storageSet: (input) => parent.transport.storageSet({ ...input, key: `${name}:${input.key}` }),
      },
    };
  }, [handlerPrefix, name, parent]);
  const scope = `${runtime.context.scope ?? ""}/${name}`;
  return (
    <WidgetContext.Provider
      value={{
        context: { ...runtime.context, scope, handlerPrefix: `${runtime.context.handlerPrefix ?? ""}${handlerPrefix}` },
        services,
        options: options ?? runtime.options,
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

function useWidgetRuntime() {
  const runtime = useContext(WidgetContext);
  if (!runtime) throw new Error("Widget SDK hooks require a Homarr widget host");
  return runtime;
}

export function useWidgetHost() {
  return useWidgetRuntime().context;
}

export function useWidgetServices() {
  return useWidgetRuntime().services;
}

export function useWidgetOptions<T extends Record<string, unknown> = Record<string, unknown>>() {
  return useWidgetRuntime().options as T;
}

function queryScope(context: WidgetHostContext) {
  return ["custom-widget-sdk", context.revisionId, context.itemId ?? context.previewId, context.userId] as const;
}

interface WidgetQueryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  staleTime?: number;
}

export function useWidgetQuery<T = unknown>(name: string, input?: unknown, options: WidgetQueryOptions = {}) {
  const { context, services } = useWidgetRuntime();
  const itemId = context.itemId ?? context.previewId;
  const query = useQuery<T>({
    queryKey: [...queryScope(context), "query", context.scope, name, input],
    queryFn: ({ signal }) => {
      if (!itemId) throw new Error("Save this widget to run its server queries");
      return services.transport.query({ itemId, name, input }, signal) as Promise<T>;
    },
    enabled: Boolean(itemId) && context.visible && options.enabled !== false,
    refetchInterval: options.refetchInterval ?? false,
    staleTime: options.staleTime ?? (typeof options.refetchInterval === "number" ? options.refetchInterval : 1_000),
    retry: false,
  });
  if (isAccessError(query.error)) return { ...query, data: undefined };
  return query;
}

function isAccessError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) return false;
  return data.code === "FORBIDDEN" || data.code === "UNAUTHORIZED" || data.code === "NOT_FOUND";
}

export function useWidgetAction<TOutput = unknown, TInput = unknown>(name: string) {
  const { context, services } = useWidgetRuntime();
  const queryClient = useQueryClient();
  return useMutation<TOutput, Error, TInput>({
    mutationFn: (input) => {
      const itemId = context.itemId ?? context.previewId;
      if (!itemId) throw new Error("Save this widget to run its server actions");
      if (context.isEditMode || context.executionEnabled === false)
        throw new Error("Widget actions are currently paused");
      return services.transport.action({ itemId, name, input }) as Promise<TOutput>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryScope(context) }),
  });
}

/** Discover controls currently available to this viewer, including exact guest-approved inputs. */
export function useWidgetCapabilities() {
  const host = useWidgetHost();
  const query = useWidgetQuery<{ actions: Record<string, { allowed: boolean; allowedInputs?: unknown[] }> }>(
    "$capabilities",
  );
  return {
    ...query,
    canRun(name: string, input?: unknown) {
      if (host.isEditMode || host.executionEnabled === false || query.error) return false;
      const capability = query.data?.actions[`${host.handlerPrefix ?? ""}${name}`];
      if (!capability?.allowed) return false;
      if (!capability.allowedInputs) return true;
      let effectiveInput = input;
      if (effectiveInput === undefined) effectiveInput = {};
      return capability.allowedInputs.some((allowed) => hashKey([allowed]) === hashKey([effectiveInput]));
    },
  };
}

export function useWidgetSubscription<T = unknown>(
  name: string,
  input?: unknown,
  options: { enabled?: boolean; maximumEvents?: number } = {},
) {
  const { context, services } = useWidgetRuntime();
  const itemId = context.itemId ?? context.previewId;
  const inputKey = hashKey([input]);
  const inputRef = useRef(input);
  inputRef.current = input;
  let maximumEvents = 60;
  if (options.maximumEvents !== undefined && Number.isFinite(options.maximumEvents))
    maximumEvents = Math.max(1, Math.floor(options.maximumEvents));
  const [attempt, setAttempt] = useState(0);
  const enabled = Boolean(itemId) && context.visible && options.enabled !== false;
  const [state, setState] = useWidgetState<{ data?: T; events: T[]; error?: Error; connected: boolean }>(
    `subscription:${hashKey([context.revisionId, context.userId, name, inputKey])}`,
    { events: [], connected: false },
  );

  useEffect(() => {
    setState((current) => ({ ...current, error: undefined, connected: false }));
    if (!enabled || !itemId) return;
    let active = true;
    const unsubscribe = services.transport.subscribe(
      { itemId, name, input: inputRef.current },
      {
        next(value) {
          if (!active) return;
          setState((current) => ({
            data: value as T,
            events: Object.is(current.data, value)
              ? current.events
              : [...current.events, value as T].slice(-maximumEvents),
            connected: true,
          }));
        },
        error(error) {
          if (!active) return;
          if (isAccessError(error)) setState({ events: [], error, connected: false });
          else setState((current) => ({ ...current, error, connected: false }));
        },
        complete() {
          if (active) setState((current) => ({ ...current, connected: false }));
        },
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    attempt,
    itemId,
    context.revisionId,
    context.userId,
    enabled,
    inputKey,
    maximumEvents,
    name,
    services.transport,
    setState,
  ]);

  return { ...state, reconnect: () => setAttempt((current) => current + 1) };
}

export function createWidgetStateStore(values: Record<string, unknown> = {}): WidgetStateStore {
  const listeners = new Set<() => void>();
  return {
    get: (key) => (Object.hasOwn(values, key) ? values[key] : undefined),
    set(key, value) {
      if (Object.hasOwn(values, key) && Object.is(values[key], value)) return;
      Object.defineProperty(values, key, { value, enumerable: true, configurable: true, writable: true });
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Instance state survives compact/advanced view changes without persisting secrets to a browser. */
export function useWidgetState<T>(key: string, initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const { services } = useWidgetRuntime();
  const [initial] = useState(initialValue);
  const getSnapshot = useCallback(() => {
    const value = services.state.get(key);
    if (value === undefined) return initial;
    return value as T;
  }, [initial, key, services.state]);
  const value = useSyncExternalStore(services.state.subscribe, getSnapshot, () => initial);
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      let nextValue = next;
      if (typeof next === "function") nextValue = (next as (previous: T) => T)(getSnapshot());
      services.state.set(key, nextValue);
    },
    [getSnapshot, key, services.state],
  );
  return [value, setValue];
}

/** Shared storage remains server-authorized; previews use an isolated temporary store. */
export function useWidgetStorage<T = unknown>(scope: WidgetStorageScope, key: string, initialValue: T) {
  const { context, services } = useWidgetRuntime();
  const itemId = context.itemId ?? context.previewId;
  const queryClient = useQueryClient();
  const queryKey = [...queryScope(context), "storage", context.scope, scope, key];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!itemId) return initialValue;
      const value = await services.transport.storageGet({ itemId, scope, key }, signal);
      if (value === undefined || value === null) return initialValue;
      return value as T;
    },
    enabled: Boolean(itemId) && context.executionEnabled !== false,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (value: T) => {
      if (!itemId || context.isEditMode || context.executionEnabled === false) {
        throw new Error("Managed widget storage cannot be changed before saving or in board edit mode");
      }
      return services.transport.storageSet({ itemId, scope, key, value });
    },
    onSuccess: (_result, value) => queryClient.setQueryData(queryKey, value),
  });
  return {
    ...query,
    data: isAccessError(query.error) ? initialValue : (query.data ?? initialValue),
    set: mutation.mutateAsync,
    saving: mutation.isPending,
    saveError: mutation.error,
  };
}

export function useWidgetCommands(commands: readonly WidgetCommand[]) {
  const { services } = useWidgetRuntime();
  const registerCommands = services.registerCommands;
  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const descriptorKey = hashKey(commands.map(({ run: _run, ...command }) => command));
  useEffect(
    () =>
      registerCommands(
        commandsRef.current.map((command) => ({
          ...command,
          run: () => commandsRef.current.find(({ id }) => id === command.id)?.run(),
        })),
      ),
    [descriptorKey, registerCommands],
  );
}

/** Shared native/custom clock, aligned to real time boundaries to avoid accumulating drift. */
export function useWidgetNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let interval = 1000;
    if (Number.isFinite(intervalMs)) interval = Math.max(16, intervalMs);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, interval - (Date.now() % interval));
    };
    setNow(Date.now());
    timer = setTimeout(tick, interval - (Date.now() % interval));
    return () => clearTimeout(timer);
  }, [enabled, intervalMs]);
  return now;
}

export function useWidgetClock(intervalMs = 1000) {
  const { visible } = useWidgetHost();
  return useWidgetNow(intervalMs, visible);
}
