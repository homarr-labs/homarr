"use client";

import type { ComponentType, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Code, Skeleton, Switch, Text, Title } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconPlayerPlay,
  IconPower,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";

import { useWidgetDefinitionId } from "./widget-definition-context";

const MAX_CALLS_PER_MINUTE = 10;
const RATE_WINDOW_MS = 60_000;
const callTimestamps = new Map<string, number[]>();

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

type SubFetchResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; data: unknown; error?: string };

const ICON_MAP: Record<string, ComponentType<{ size?: number | string }>> = {
  play: IconPlayerPlay,
  check: IconCheck,
  refresh: IconRefresh,
  power: IconPower,
  trash: IconTrash,
};

const SubFetchDataContext = createContext<unknown>(undefined);

function checkRateLimit(definitionId: string): boolean {
  const now = Date.now();
  const calls = callTimestamps.get(definitionId) ?? [];
  const recent = calls.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_CALLS_PER_MINUTE) return false;
  recent.push(now);
  callTimestamps.set(definitionId, recent);
  return true;
}

function parseBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

function parseMethod(method?: string): HttpMethod {
  const upper = (method ?? "GET").toUpperCase();
  if (HTTP_METHODS.includes(upper as HttpMethod)) return upper as HttpMethod;
  return "GET";
}

function parseJsonRecord(str?: string): Record<string, string> | undefined {
  if (!str?.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(str);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = String(value);
    }
    return result;
  } catch {
    return undefined;
  }
}

function getByPath(obj: unknown, path?: string): unknown {
  if (!path?.trim()) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function formatDisplayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function useSubFetchExecutor() {
  const definitionId = useWidgetDefinitionId();
  const mutation = clientApi.widget.customApi.subFetch.useMutation();

  const execute = useCallback(
    async (params: { url: string; method?: string; body?: string; headers?: string }): Promise<SubFetchResult> => {
      if (!definitionId) {
        return { ok: false as const, status: 0, data: null, error: "Widget definition not available" };
      }
      if (!checkRateLimit(definitionId)) {
        return { ok: false as const, status: 0, data: null, error: "Rate limit exceeded (10 calls/minute)" };
      }

      return mutation.mutateAsync({
        definitionId,
        url: params.url,
        method: parseMethod(params.method),
        body: params.body,
        headers: parseJsonRecord(params.headers),
      });
    },
    [definitionId, mutation],
  );

  return { execute, isPending: mutation.isPending };
}

export interface SubFetchProps {
  url: string;
  method?: string;
  body?: string;
  headers?: string;
  trigger?: "auto" | "manual";
  label?: string;
  color?: string;
  variant?: string;
  children?: ReactNode;
  loadingText?: string;
  errorText?: string;
  display?: "json" | "text";
  path?: string;
}

export function SubFetch({
  url,
  method,
  body,
  headers,
  trigger = "auto",
  label = "Fetch",
  color = "blue",
  variant = "filled",
  children,
  loadingText = "Loading...",
  errorText,
  display,
  path,
}: SubFetchProps) {
  const { execute, isPending } = useSubFetchExecutor();
  const [subData, setSubData] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const runFetch = useCallback(async () => {
    setError(null);
    const result = await execute({ url, method, body, headers });
    if (result.ok) {
      setSubData(result.data);
      setFetched(true);
    } else {
      setError(result.error ?? errorText ?? `Request failed (${result.status})`);
      setFetched(true);
    }
  }, [execute, url, method, body, headers, errorText]);

  useEffect(() => {
    if (trigger === "auto") {
      void runFetch();
    }
  }, [trigger, runFetch]);

  if (trigger === "manual" && !fetched && !isPending) {
    return (
      <Button color={color} variant={variant as never} onClick={() => void runFetch()} loading={isPending}>
        {label}
      </Button>
    );
  }

  if (isPending) {
    return (
      <div>
        <Skeleton height={8} radius="xl" mb="xs" />
        <Text size="xs" c="dimmed">
          {loadingText}
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
        <Text size="xs">{error}</Text>
      </Alert>
    );
  }

  const contextValue = subData;

  if (display === "json") {
    return (
      <SubFetchDataContext.Provider value={contextValue}>
        <Code block style={{ fontSize: 11 }}>
          {JSON.stringify(subData, null, 2)}
        </Code>
      </SubFetchDataContext.Provider>
    );
  }

  if (display === "text" && path) {
    return (
      <SubFetchDataContext.Provider value={contextValue}>
        <Text size="sm">{formatDisplayValue(getByPath(subData, path))}</Text>
      </SubFetchDataContext.Provider>
    );
  }

  if (!children) {
    return (
      <SubFetchDataContext.Provider value={contextValue}>
        <Code block style={{ fontSize: 11 }}>
          {JSON.stringify(subData, null, 2)}
        </Code>
      </SubFetchDataContext.Provider>
    );
  }

  return <SubFetchDataContext.Provider value={contextValue}>{children}</SubFetchDataContext.Provider>;
}

export interface SubDataProps {
  path?: string;
  as?: string;
  order?: number;
  size?: string;
  color?: string;
  variant?: string;
  fw?: number;
  c?: string;
}


export function SubData({ path, as = "Text", ...props }: SubDataProps) {
  const subData = useContext(SubFetchDataContext);
  const value = getByPath(subData, path);

  if (value === undefined && path) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }

  const displayValue = as === "Code" ? JSON.stringify(value, null, 2) : formatDisplayValue(value);

  if (as === "Title") {
    return (
      <Title order={(props.order as 1 | 2 | 3 | 4 | 5 | 6) ?? 3} c={props.c}>
        {displayValue}
      </Title>
    );
  }

  if (as === "Badge") {
    return (
      <Badge color={props.color} variant={props.variant as never} size={props.size as never}>
        {displayValue}
      </Badge>
    );
  }

  if (as === "Code") {
    return <Code block>{displayValue}</Code>;
  }

  return (
    <Text size={props.size as never} fw={props.fw} c={props.c}>
      {displayValue}
    </Text>
  );
}

export interface ActionButtonProps {
  url: string;
  method?: string;
  body?: string;
  headers?: string;
  label: string;
  color?: string;
  variant?: string;
  size?: string;
  confirmMessage?: string;
  successMessage?: string;
  icon?: string;
  fullWidth?: boolean | string;
  disabled?: boolean | string;
}

export function ActionButton({
  url,
  method = "POST",
  body,
  headers,
  label,
  color = "blue",
  variant = "filled",
  size = "sm",
  confirmMessage,
  successMessage,
  icon,
  fullWidth,
  disabled,
}: ActionButtonProps) {
  const { execute, isPending } = useSubFetchExecutor();
  const { openConfirmModal } = useConfirmModal();
  const Icon = icon ? ICON_MAP[icon.toLowerCase()] : undefined;

  const runAction = async () => {
    const result = await execute({ url, method, body, headers });
    if (result.ok) {
      if (successMessage) {
        showSuccessNotification({ title: label, message: successMessage });
      }
    } else {
      showErrorNotification({ title: label, message: result.error ?? `Request failed (${result.status})` });
    }
  };

  const handleClick = () => {
    if (confirmMessage) {
      openConfirmModal({
        title: label,
        children: confirmMessage,
        onConfirm: () => void runAction(),
      });
    } else {
      void runAction();
    }
  };

  return (
    <Button
      color={color}
      variant={variant as never}
      size={size as never}
      onClick={handleClick}
      loading={isPending}
      leftSection={Icon ? <Icon size={16} /> : undefined}
      fullWidth={parseBool(fullWidth)}
      disabled={parseBool(disabled)}
    >
      {label}
    </Button>
  );
}

export interface ToggleSwitchProps {
  url: string;
  method?: string;
  onBody?: string;
  offBody?: string;
  initialValue?: boolean | string;
  label?: string;
  color?: string;
  size?: string;
  disabled?: boolean | string;
}

export function ToggleSwitch({
  url,
  method = "POST",
  onBody,
  offBody,
  initialValue = false,
  label,
  color = "blue",
  size = "sm",
  disabled,
}: ToggleSwitchProps) {
  const { execute, isPending } = useSubFetchExecutor();
  const [checked, setChecked] = useState(parseBool(initialValue));
  const pendingRef = useRef(false);

  const handleChange = async (next: boolean) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const prev = checked;
    setChecked(next);

    const result = await execute({
      url,
      method,
      body: next ? onBody : offBody,
    });

    pendingRef.current = false;
    if (!result.ok) {
      setChecked(prev);
      showErrorNotification({ title: label ?? "Toggle", message: result.error ?? "Request failed" });
    }
  };

  return (
    <Switch
      label={label}
      color={color}
      size={size as never}
      checked={checked}
      onChange={(event) => void handleChange(event.currentTarget.checked)}
      disabled={parseBool(disabled) || isPending}
    />
  );
}

export interface RefreshButtonProps {
  label?: string;
  color?: string;
  variant?: string;
  size?: string;
}

export function RefreshButton({
  label = "Refresh",
  color = "blue",
  variant = "light",
  size = "sm",
}: RefreshButtonProps) {
  const definitionId = useWidgetDefinitionId();
  const utils = clientApi.useUtils();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    if (!definitionId) return;
    setLoading(true);
    try {
      await utils.widget.customApi.getData.invalidate({ definitionId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      color={color}
      variant={variant as never}
      size={size as never}
      leftSection={<IconRefresh size={16} />}
      onClick={() => void handleRefresh()}
      loading={loading}
    >
      {label}
    </Button>
  );
}
