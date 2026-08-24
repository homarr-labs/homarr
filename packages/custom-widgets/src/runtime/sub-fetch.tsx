"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Code, Skeleton, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { useCustomWidgetRuntime } from "./context";
import { formatDisplayValue, getByPath, normalizeParams, SubFetchDataContext } from "./data";
import { RequestIdRequiredAlert } from "./status";
import type { CustomJsxRuntimeParams } from "./types";

export interface SubFetchMetadata {
  ok: boolean;
  status: number;
  statusText?: string;
  loading: false;
  error?: undefined;
}

export interface SubFetchProps {
  requestId?: string;
  params?: CustomJsxRuntimeParams;
  refreshInterval?: number;
  children?: ReactNode | ((data: unknown, metadata: SubFetchMetadata) => ReactNode);
  loadingLabel?: string;
  errorMessage?: string;
  fallback?: ReactNode;
  triggerContent?: ReactNode;
  triggerAriaLabel?: string;
  path?: string;
  as?: "json" | "text";
  trigger?: "auto" | "manual";
}

// Browser timers use signed 32-bit millisecond delays. Whole-second refresh
// intervals are capped at the largest value that remains below that boundary.
export const MAX_REFRESH_INTERVAL_SECONDS = 2_147_483;
export const MAX_REFRESH_INTERVAL_MS = MAX_REFRESH_INTERVAL_SECONDS * 1_000;

export function SubFetch(props: SubFetchProps) {
  const { itemId, previewSessionId, queryCacheKey, queriesDisabled, port, messages, setQueryState } =
    useCustomWidgetRuntime();
  const [manualRun, setManualRun] = useState(false);
  const params = useMemo(() => normalizeParams(props.params), [props.params]);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  useEffect(() => setManualRun(false), [paramsKey, props.requestId, props.trigger]);
  const enabled = Boolean(
    !queriesDisabled &&
    (itemId || previewSessionId) &&
    props.requestId &&
    params &&
    (props.trigger !== "manual" || manualRun),
  );
  const refreshMs = normalizeRefreshInterval(props.refreshInterval);
  const scope = itemId ? "item" : "preview";
  const scopeId = itemId ?? previewSessionId;
  const query = useQuery({
    queryKey: ["custom-widget", scope, scopeId, props.requestId, paramsKey, queryCacheKey],
    queryFn: ({ signal }) =>
      port.query({ itemId, previewSessionId, requestId: props.requestId ?? "", params: params ?? {} }, signal),
    enabled,
    retry: 2,
    refetchInterval: refreshMs,
  });
  useEffect(() => {
    // Manual queries are local to their SubFetch instance. Publishing them by request ID makes
    // repeated cards compete for the same data slot and can remount the active query mid-request.
    if (!props.requestId || !setQueryState || props.trigger === "manual") return;
    if (!enabled) {
      setQueryState(props.requestId, null);
      return;
    }
    const result = query.data;
    setQueryState(props.requestId, {
      data: result?.data ?? null,
      status: {
        loading: query.isFetching && !result,
        ok: result?.ok,
        status: result?.status,
        statusText: result?.statusText,
        error: result?.error ?? (query.error ? messages.requestFailed : undefined),
      },
    });
  }, [
    enabled,
    messages.requestFailed,
    props.requestId,
    props.trigger,
    query.data,
    query.error,
    query.isFetching,
    setQueryState,
  ]);

  if (!props.requestId) return <RequestIdRequiredAlert />;
  if (queriesDisabled) return props.trigger === "manual" ? (props.triggerContent ?? null) : null;
  if (!itemId && !previewSessionId)
    return props.trigger === "manual" && props.triggerContent
      ? props.triggerContent
      : (props.fallback ?? <Text c="dimmed">{messages.unsavedPreview}</Text>);
  if (!params) return <RequestAlert message={messages.invalidParams} />;
  if (props.trigger === "manual" && !manualRun) {
    if (props.triggerContent) {
      return (
        <Box
          component="button"
          type="button"
          aria-label={props.triggerAriaLabel ?? messages.loadRequest}
          onClick={() => setManualRun(true)}
          style={{
            appearance: "none",
            background: "transparent",
            border: 0,
            color: "inherit",
            cursor: "pointer",
            font: "inherit",
            padding: 0,
            textAlign: "inherit",
            width: "100%",
          }}
        >
          {props.triggerContent}
        </Box>
      );
    }
    return (
      <Button size="compact-sm" variant="light" onClick={() => setManualRun(true)}>
        {messages.loadRequest}
      </Button>
    );
  }
  if (!props.children && props.path === undefined && props.as === undefined) return null;

  const result = query.data;
  const requestError =
    (query.error && !result ? messages.requestFailed : null) ??
    (!result?.ok ? (result?.error ?? `${messages.requestFailed} (${result?.status ?? 0})`) : null);
  if (!result && query.isPending) return props.fallback ?? <Loading label={props.loadingLabel ?? messages.loading} />;
  if (requestError) {
    return (
      <RequestAlert message={props.errorMessage ?? requestError}>
        <Button
          size="compact-xs"
          variant="subtle"
          mt={4}
          onClick={() => void query.refetch()}
          loading={query.isFetching}
        >
          {messages.retry}
        </Button>
      </RequestAlert>
    );
  }

  const content = renderContent(props, result?.data, {
    ok: result?.ok ?? false,
    status: result?.status ?? 0,
    statusText: result?.statusText,
    loading: false,
  });
  return <SubFetchDataContext.Provider value={result?.data}>{content}</SubFetchDataContext.Provider>;
}

export function normalizeRefreshInterval(value: number | undefined): number | false {
  if (!value || !Number.isFinite(value) || value <= 0) return false;
  return Math.max(1_000, Math.min(value, MAX_REFRESH_INTERVAL_SECONDS) * 1_000);
}

function renderContent(props: SubFetchProps, data: unknown, metadata: SubFetchMetadata) {
  if (typeof props.children === "function") return props.children(data, metadata);
  if (props.children) return props.children;
  if (props.path === undefined && props.as === undefined) return null;
  const value = getByPath(data, props.path);
  if (props.as === "text") return <Text size="sm">{formatDisplayValue(value)}</Text>;
  return (
    <Code block style={{ fontSize: 11 }}>
      {JSON.stringify(value, null, 2)}
    </Code>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div>
      <Skeleton height={8} radius="xl" mb="xs" />
      <Text c="dimmed">{label}</Text>
    </div>
  );
}

function RequestAlert({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs">{message}</Text>
      {children}
    </Alert>
  );
}
