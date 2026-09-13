"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Text } from "@mantine/core";

import { ActionButton } from "./actions";
import type { ActionButtonProps } from "./actions";
import { CustomWidgetRuntimeProvider, useCustomWidgetRuntime } from "./context";
import { normalizeParams } from "./data";
import { SubFetch } from "./sub-fetch";
import type { SubFetchProps } from "./sub-fetch";
import type { CustomWidgetRequestResult, CustomWidgetRuntimeValue } from "./types";

interface NativeQueryProps extends Omit<SubFetchProps, "requestId"> {
  nativeId: string;
  live?: boolean;
}

export function NativeQuery({ nativeId, live, ...props }: NativeQueryProps) {
  const runtime = useCustomWidgetRuntime();
  const adapted = useMemo(() => adaptNativeRuntime(runtime), [runtime]);
  if (runtime.queriesDisabled) {
    const fixture = runtime.queryFixtures?.[nativeId];
    if (!fixture) return null;
    if (fixture.status.loading) return <Text c="dimmed">{runtime.messages.loading}</Text>;
    if (fixture.status.error || fixture.status.ok === false)
      return <Alert color="red">{fixture.status.error ?? runtime.messages.requestFailed}</Alert>;
    if (typeof props.children === "function")
      return <>{props.children(fixture.data, { ok: true, status: fixture.status.status ?? 200, loading: false })}</>;
    return <>{props.children}</>;
  }
  if (live) return <NativeLiveQuery nativeId={nativeId} {...props} />;
  let children = props.children;
  if (typeof children === "function") {
    const renderChildren = children;
    children = (data, metadata) => renderWithRuntime(renderChildren(data, metadata), runtime);
  } else {
    children = renderWithRuntime(children, runtime);
  }
  return (
    <CustomWidgetRuntimeProvider {...adapted}>
      <SubFetch
        {...props}
        requestId={nativeId}
        fallback={renderWithRuntime(props.fallback, runtime)}
        triggerContent={renderWithRuntime(props.triggerContent, runtime)}
      >
        {children}
      </SubFetch>
    </CustomWidgetRuntimeProvider>
  );
}

export function NativeActionButton({
  nativeId,
  ...props
}: Omit<ActionButtonProps, "requestId"> & { nativeId: string }) {
  const runtime = useCustomWidgetRuntime();
  const adapted = useMemo(() => adaptNativeRuntime(runtime), [runtime]);
  return (
    <CustomWidgetRuntimeProvider {...adapted}>
      <ActionButton {...props} requestId={nativeId}>
        {renderWithRuntime(props.children, runtime)}
      </ActionButton>
    </CustomWidgetRuntimeProvider>
  );
}

function renderWithRuntime(content: ReactNode, runtime: CustomWidgetRuntimeValue): ReactNode {
  // Native execution belongs to this helper; authored descendants retain the host's HTTP and native ports.
  // Preserve primitive children so absent content, path/as rendering, and action titles keep their semantics.
  if (content === null || typeof content !== "object") return content;
  return <CustomWidgetRuntimeProvider {...runtime}>{content}</CustomWidgetRuntimeProvider>;
}

function adaptNativeRuntime(runtime: CustomWidgetRuntimeValue): CustomWidgetRuntimeValue {
  const unavailable = () =>
    Promise.resolve({ ok: false, status: 0, data: null, error: runtime.messages.requestFailed });
  return {
    ...runtime,
    queryCacheKey: `native:${runtime.queryCacheKey ?? ""}`,
    requestCapabilities: Object.entries(runtime.nativeCapabilities ?? {}).map(([id, capability]) => ({
      id,
      kind: capability.kind,
      method: "POST",
      trigger: capability.trigger,
      minimumBoardPermission: capability.permission,
      confirmation: capability.confirmation,
    })),
    port: {
      ...runtime.port,
      query: ({ requestId, ...input }, signal) => {
        if (!runtime.port.queryNative) return unavailable();
        return runtime.port.queryNative({ ...input, nativeId: requestId }, signal);
      },
      executeAction: ({ requestId, ...input }) => {
        if (!runtime.port.executeNativeAction) return unavailable();
        return runtime.port.executeNativeAction({ ...input, nativeId: requestId });
      },
    },
  };
}

function NativeLiveQuery({ nativeId, ...props }: NativeQueryProps) {
  const { itemId, previewSessionId, queryCacheKey, queriesDisabled, port, messages, setQueryState } =
    useCustomWidgetRuntime();
  const paramsKey = JSON.stringify(normalizeParams(props.params));
  const params = useMemo(() => JSON.parse(paramsKey) as ReturnType<typeof normalizeParams>, [paramsKey]);
  const requestKey = JSON.stringify([itemId, previewSessionId, nativeId, params, queryCacheKey]);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{ key: string; result: CustomWidgetRequestResult } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Host callbacks can change when a result is published; only semantic inputs restart a live stream.
  const subscriptionPort = useRef(port.subscribeNative);
  subscriptionPort.current = port.subscribeNative;
  const canSubscribe = Boolean(port.subscribeNative);
  const enabled =
    !queriesDisabled &&
    Boolean(itemId || previewSessionId) &&
    Boolean(params) &&
    (props.trigger !== "manual" || manualKey === requestKey);
  useEffect(() => {
    const subscribe = subscriptionPort.current;
    if (!canSubscribe || !enabled || !subscribe || !params) return;
    let active = true;
    const stop = subscribe(
      { itemId, previewSessionId, nativeId, params },
      (result) => {
        if (active) setResultState({ key: requestKey, result });
      },
      (error) => {
        if (active)
          setResultState((previous) => {
            let data: unknown = null;
            if (previous?.key === requestKey) data = previous.result.data;
            return { key: requestKey, result: { ok: false, status: 0, data, error: error.message } };
          });
      },
    );
    return () => {
      active = false;
      stop();
    };
  }, [attempt, canSubscribe, enabled, itemId, nativeId, params, previewSessionId, requestKey]);
  useEffect(() => {
    if (!setQueryState || props.trigger === "manual") return;
    if (!enabled) {
      setQueryState(nativeId, null);
      return;
    }
    let result: CustomWidgetRequestResult | undefined;
    if (resultState?.key === requestKey) result = resultState.result;
    setQueryState(nativeId, {
      data: result?.data ?? null,
      status: {
        loading: !result,
        ok: result?.ok,
        status: result?.status,
        error: result?.error,
      },
    });
  }, [enabled, nativeId, props.trigger, requestKey, resultState, setQueryState]);
  if (queriesDisabled) return null;
  if (!itemId && !previewSessionId) return <Text c="dimmed">{messages.unsavedPreview}</Text>;
  if (!params) return <Alert color="red">{messages.invalidParams}</Alert>;
  if (props.trigger === "manual" && manualKey !== requestKey) {
    return (
      <Button type="button" onClick={() => setManualKey(requestKey)}>
        {messages.loadRequest}
      </Button>
    );
  }
  if (!canSubscribe) return <Alert color="red">{messages.requestFailed}</Alert>;
  let result: CustomWidgetRequestResult | undefined;
  if (resultState?.key === requestKey) result = resultState.result;
  if (!result)
    return (
      <Text size="sm" c="dimmed">
        {messages.loading}
      </Text>
    );
  let error: ReactNode = null;
  if (!result.ok)
    error = (
      <Alert color="red">
        <Text size="sm">{result.error ?? messages.requestFailed}</Text>
        <Button
          type="button"
          size="compact-xs"
          onClick={() => {
            setAttempt((value) => value + 1);
          }}
        >
          {messages.retry}
        </Button>
      </Alert>
    );
  if (!result.ok && result.data === null) return error;
  let children: ReactNode = props.children as ReactNode;
  if (typeof props.children === "function")
    children = props.children(result.data, {
      ok: result.ok,
      status: result.status,
      loading: false,
      error: result.error,
      stale: !result.ok,
    });
  return (
    <>
      {error}
      {children}
    </>
  );
}
