"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Code, Skeleton, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { useCustomWidgetRuntime } from "./context";
import { formatDisplayValue, getByPath, normalizeParams, SubFetchDataContext } from "./data";
import { MigrationRequiredAlert } from "./status";
import type { CustomJsxRuntimeParams } from "./types";

export interface SubFetchMetadata {
  ok: boolean;
  status: number;
  statusText?: string;
}

export interface SubFetchProps {
  requestId?: string;
  params?: CustomJsxRuntimeParams;
  refreshInterval?: number;
  children?: ReactNode;
  render?: (data: unknown, metadata: SubFetchMetadata) => ReactNode;
  loadingLabel?: string;
  errorMessage?: string;
  fallback?: ReactNode;
  path?: string;
  as?: "json" | "text";
  trigger?: "auto" | "manual";
  /** @deprecated Inline targets are inert in JSX API v2. */
  url?: string;
  /** @deprecated Request manifests own the method, body, and headers. */
  method?: string;
  body?: string;
  headers?: string;
}

export function SubFetch(props: SubFetchProps) {
  const { itemId, previewSessionId, port, messages } = useCustomWidgetRuntime();
  const [manualRun, setManualRun] = useState(false);
  const params = useMemo(() => normalizeParams(props.params), [props.params]);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  useEffect(() => setManualRun(false), [paramsKey, props.requestId, props.trigger]);
  const enabled = Boolean(
    (itemId || previewSessionId) && props.requestId && params && (props.trigger !== "manual" || manualRun),
  );
  const refreshMs = normalizeRefreshInterval(props.refreshInterval);
  const query = useQuery({
    queryKey: ["custom-widget", itemId ?? previewSessionId, props.requestId, paramsKey],
    queryFn: ({ signal }) =>
      port.query({ itemId, previewSessionId, requestId: props.requestId ?? "", params: params ?? {} }, signal),
    enabled,
    retry: 2,
    refetchInterval: refreshMs,
  });

  if (!props.requestId) return <MigrationRequiredAlert />;
  if (!itemId && !previewSessionId) return props.fallback ?? <Text c="dimmed">{messages.unsavedPreview}</Text>;
  if (!params) return <RequestAlert message={messages.invalidParams} />;
  if (props.trigger === "manual" && !manualRun) {
    return (
      <Button size="compact-sm" variant="light" onClick={() => setManualRun(true)}>
        {messages.loadRequest}
      </Button>
    );
  }

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

  const content = renderContent(props, result?.data, result);
  return <SubFetchDataContext.Provider value={result?.data}>{content}</SubFetchDataContext.Provider>;
}

function normalizeRefreshInterval(value: number | undefined): number | false {
  return value && Number.isFinite(value) && value > 0 ? Math.max(1_000, value * 1_000) : false;
}

function renderContent(props: SubFetchProps, data: unknown, result: SubFetchMetadata | undefined) {
  if (props.render) {
    return props.render(data, {
      ok: result?.ok ?? false,
      status: result?.status ?? 0,
      statusText: result?.statusText,
    });
  }
  if (props.children) return props.children;
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
