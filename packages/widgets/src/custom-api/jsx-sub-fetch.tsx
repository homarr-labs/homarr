"use client";

import type { ComponentType, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Code, Image, Skeleton, Switch, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPlayerPlay, IconPower, IconRefresh, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { useCustomJsxRuntime } from "./widget-definition-context";

type RuntimeParam = string | number | boolean;
export type CustomJsxRuntimeParams = Record<string, RuntimeParam>;

interface RequestResult {
  ok: boolean;
  status: number;
  statusText?: string;
  data: unknown;
  error?: string;
  simulated?: boolean;
}

export interface SubFetchMetadata {
  ok: boolean;
  status: number;
  statusText?: string;
}

const ICON_MAP: Record<string, ComponentType<{ size?: number | string }>> = {
  play: IconPlayerPlay,
  check: IconCheck,
  refresh: IconRefresh,
  power: IconPower,
  trash: IconTrash,
};

const SubFetchDataContext = createContext<unknown>(undefined);

function parseBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

function normalizeParams(value: unknown): CustomJsxRuntimeParams | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: CustomJsxRuntimeParams = {};
  for (const [key, param] of Object.entries(value)) {
    if (key === "constructor" || key === "prototype" || key === "__proto__") return null;
    if (typeof param !== "string" && typeof param !== "number" && typeof param !== "boolean") return null;
    result[key] = param;
  }
  return result;
}

function getByPath(obj: unknown, path?: string): unknown {
  if (!path?.trim()) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    if (key === "constructor" || key === "prototype" || key === "__proto__") return undefined;
    return Object.hasOwn(acc, key) ? (acc as Record<string, unknown>)[key] : undefined;
  }, obj);
}

function formatDisplayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function MigrationRequiredAlert() {
  const t = useScopedI18n("widget.customApi.customJsx");
  return (
    <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs">{t("migrationRequired")}</Text>
    </Alert>
  );
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
  /** @deprecated Inline targets are inert in JSX API v2. */
  url?: string;
  /** @deprecated The method is defined by the named request manifest. */
  method?: string;
  /** @deprecated The body is defined by the named request manifest. */
  body?: string;
  /** @deprecated Headers are defined by the named request manifest. */
  headers?: string;
  /** Set to manual to wait for an explicit user gesture before the first query. */
  trigger?: "auto" | "manual";
}

export function SubFetch({
  requestId,
  params,
  refreshInterval,
  children,
  render,
  loadingLabel,
  errorMessage,
  fallback,
  path,
  as,
  trigger = "auto",
}: SubFetchProps) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const { itemId, previewSessionId } = useCustomJsxRuntime();
  const [manualRun, setManualRun] = useState(false);
  const normalizedParams = useMemo(() => normalizeParams(params), [params]);
  const requestKey = useMemo(() => JSON.stringify(normalizedParams), [normalizedParams]);
  useEffect(() => setManualRun(false), [requestId, requestKey, trigger]);
  const canRun = Boolean((itemId || previewSessionId) && requestId && normalizedParams);
  const boardQuery = clientApi.widget.customApi.queryRequest.useQuery(
    {
      itemId: itemId ?? "",
      requestId: requestId ?? "",
      params: normalizedParams ?? {},
    },
    {
      enabled: Boolean(itemId) && canRun && (trigger === "auto" || manualRun),
      retry: 2,
      refetchInterval:
        refreshInterval && Number.isFinite(refreshInterval) && refreshInterval > 0
          ? Math.max(1_000, refreshInterval * 1_000)
          : false,
    },
  );
  const previewQuery = clientApi.customWidget.previewQuery.useQuery(
    {
      sessionId: previewSessionId ?? "",
      requestId: requestId ?? "",
      params: normalizedParams ?? {},
    },
    {
      enabled: Boolean(previewSessionId && !itemId) && canRun && (trigger === "auto" || manualRun),
      retry: 2,
      refetchInterval:
        refreshInterval && Number.isFinite(refreshInterval) && refreshInterval > 0
          ? Math.max(1_000, refreshInterval * 1_000)
          : false,
    },
  );
  const query = itemId ? boardQuery : previewQuery;

  if (!requestId) return <MigrationRequiredAlert />;
  if (!itemId && !previewSessionId) {
    return (
      fallback ?? (
        <Text size="xs" c="dimmed">
          {t("unsavedPreview")}
        </Text>
      )
    );
  }
  if (!normalizedParams) {
    return (
      <Alert color="red" variant="light" p="xs">
        <Text size="xs">{t("invalidParams")}</Text>
      </Alert>
    );
  }
  if (trigger === "manual" && !manualRun) {
    return (
      <Button size="compact-sm" variant="light" onClick={() => setManualRun(true)}>
        {t("loadRequest")}
      </Button>
    );
  }

  const result = query.data as RequestResult | undefined;
  const requestError =
    (query.error && !result ? t("requestFailed") : null) ??
    (!result?.ok ? (result?.error ?? `${t("requestFailed")} (${result?.status ?? 0})`) : null);

  if (!result && query.isPending) {
    return (
      fallback ?? (
        <div>
          <Skeleton height={8} radius="xl" mb="xs" />
          <Text size="xs" c="dimmed">
            {loadingLabel ?? t("loading")}
          </Text>
        </div>
      )
    );
  }

  if (requestError) {
    return (
      <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
        <Text size="xs">{errorMessage ?? requestError}</Text>
        <Button
          size="compact-xs"
          variant="subtle"
          mt={4}
          onClick={() => void query.refetch()}
          loading={query.isFetching}
        >
          {t("retry")}
        </Button>
      </Alert>
    );
  }

  const subData = result?.data;
  let content = render
    ? render(subData, { ok: result?.ok ?? false, status: result?.status ?? 0, statusText: result?.statusText })
    : children;
  if (!render && (as === "json" || (!children && as !== "text"))) {
    content = (
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(path ? getByPath(subData, path) : subData, null, 2)}
      </Code>
    );
  } else if (!render && as === "text") {
    content = <Text size="sm">{formatDisplayValue(getByPath(subData, path))}</Text>;
  }

  return <SubFetchDataContext.Provider value={subData}>{content}</SubFetchDataContext.Provider>;
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
  alt?: string;
  fit?: string;
  w?: string | number;
  h?: string | number;
  radius?: string | number;
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

  if (as === "Code") return <Code block>{displayValue}</Code>;

  if (as === "Image") {
    const src = safeDisplayImageUrl(value);
    if (!src) return null;
    return (
      <Image src={src} alt={props.alt ?? ""} fit={props.fit as never} w={props.w} h={props.h} radius={props.radius} />
    );
  }

  return (
    <Text size={props.size as never} fw={props.fw} c={props.c}>
      {displayValue}
    </Text>
  );
}

function safeDisplayImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function useActionExecutor() {
  const t = useScopedI18n("widget.customApi.customJsx");
  const runtime = useCustomJsxRuntime();
  const boardMutation = clientApi.widget.customApi.executeAction.useMutation();
  const previewMutation = clientApi.customWidget.previewAction.useMutation();

  const execute = useCallback(
    async (requestId: string, params: CustomJsxRuntimeParams, confirmed: boolean): Promise<RequestResult> => {
      if (!runtime.itemId && !runtime.previewSessionId) {
        return { ok: false, status: 0, data: null, error: t("widgetItemUnavailable") };
      }
      if (runtime.isEditMode) {
        return { ok: false, status: 0, data: null, error: t("actionsDisabledEditMode") };
      }
      if (runtime.itemId) {
        return boardMutation.mutateAsync({ itemId: runtime.itemId, requestId, params, confirmed });
      }
      return previewMutation.mutateAsync({
        sessionId: runtime.previewSessionId ?? "",
        requestId,
        params,
        confirmed,
      });
    },
    [boardMutation, previewMutation, runtime.isEditMode, runtime.itemId, runtime.previewSessionId, t],
  );

  return {
    execute,
    isPending: boardMutation.isPending || previewMutation.isPending,
    itemId: runtime.itemId,
    previewSessionId: runtime.previewSessionId,
    canExecute: Boolean(runtime.itemId || runtime.previewSessionId),
    isEditMode: runtime.isEditMode,
    requestCapabilities: runtime.requestCapabilities ?? [],
  };
}

async function invalidateAfterAction(
  utils: ReturnType<typeof clientApi.useUtils>,
  itemId: string | undefined,
  previewSessionId: string | undefined,
  invalidate: readonly string[] | undefined,
) {
  if (!invalidate?.length) return;
  if (previewSessionId) {
    await utils.customWidget.previewQuery.invalidate();
    return;
  }
  if (!itemId) return;
  if (invalidate.includes("parent")) await utils.widget.customApi.getData.invalidate({ itemId });
  if (invalidate.some((entry) => entry !== "parent")) await utils.widget.customApi.queryRequest.invalidate();
}

export interface ActionButtonProps {
  requestId?: string;
  params?: CustomJsxRuntimeParams;
  label: string;
  color?: string;
  variant?: string;
  size?: string;
  confirmMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  icon?: string;
  invalidate?: string[];
  disabled?: boolean | string;
  /** @deprecated Inline targets are inert in JSX API v2. */
  url?: string;
  /** @deprecated The method is defined by the named request manifest. */
  method?: string;
  /** @deprecated The body is defined by the named request manifest. */
  body?: string;
  /** @deprecated Headers are defined by the named request manifest. */
  headers?: string;
  /** @deprecated Use normal Mantine sizing props. */
  fullWidth?: boolean | string;
}

export function ActionButton({
  requestId,
  params,
  label,
  color = "blue",
  variant = "filled",
  size = "sm",
  confirmMessage,
  successMessage,
  errorMessage,
  icon,
  invalidate,
  disabled,
}: ActionButtonProps) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const { execute, isPending, itemId, previewSessionId, canExecute, isEditMode, requestCapabilities } =
    useActionExecutor();
  const utils = clientApi.useUtils();
  const { openConfirmModal } = useConfirmModal();
  const Icon = icon ? ICON_MAP[icon.toLowerCase()] : undefined;
  const normalizedParams = normalizeParams(params);
  const requiresConfirmation = requestCapabilities.some(
    (capability) => capability.id === requestId && capability.kind === "action" && capability.method === "DELETE",
  );

  const runAction = async (confirmed: boolean) => {
    if (!requestId || !normalizedParams) return;
    try {
      const result = await execute(requestId, normalizedParams, confirmed);
      if (result.ok) {
        showSuccessNotification({
          title: label,
          message: successMessage ?? (result.simulated ? t("actionSimulated") : t("actionCompleted")),
        });
        await invalidateAfterAction(utils, itemId, previewSessionId, invalidate);
      } else {
        showErrorNotification({
          title: label,
          message: errorMessage ?? result.error ?? `${t("requestFailed")} (${result.status})`,
        });
      }
    } catch {
      showErrorNotification({
        title: label,
        message: errorMessage ?? t("requestFailed"),
      });
    }
  };

  const handleClick = () => {
    if (confirmMessage || requiresConfirmation) {
      openConfirmModal({
        title: label,
        children: confirmMessage ?? t("confirmDelete"),
        onConfirm: () => void runAction(true),
      });
    } else {
      void runAction(false);
    }
  };

  if (!requestId) return <MigrationRequiredAlert />;
  return (
    <Button
      color={color}
      variant={variant as never}
      size={size as never}
      onClick={handleClick}
      loading={isPending}
      leftSection={Icon ? <Icon size={16} /> : undefined}
      disabled={parseBool(disabled) || isEditMode || !canExecute || !normalizedParams}
    >
      {label}
    </Button>
  );
}

export interface ToggleSwitchProps {
  requestId?: string;
  onParams?: CustomJsxRuntimeParams;
  offParams?: CustomJsxRuntimeParams;
  initialValue?: boolean | string;
  label?: string;
  color?: string;
  size?: string;
  errorMessage?: string;
  invalidate?: string[];
  disabled?: boolean | string;
  /** @deprecated Inline targets are inert in JSX API v2. */
  url?: string;
  /** @deprecated The method is defined by the named request manifest. */
  method?: string;
  /** @deprecated Use onParams. */
  onBody?: string;
  /** @deprecated Use offParams. */
  offBody?: string;
}

export function ToggleSwitch({
  requestId,
  onParams,
  offParams,
  initialValue = false,
  label,
  color = "blue",
  size = "sm",
  errorMessage,
  invalidate,
  disabled,
}: ToggleSwitchProps) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const { execute, isPending, itemId, previewSessionId, canExecute, isEditMode } = useActionExecutor();
  const utils = clientApi.useUtils();
  const initial = parseBool(initialValue);
  const [checked, setChecked] = useState(initial);
  const pendingRef = useRef(false);
  const normalizedOnParams = normalizeParams(onParams);
  const normalizedOffParams = normalizeParams(offParams);

  useEffect(() => {
    if (!pendingRef.current) setChecked(initial);
  }, [initial]);

  const handleChange = async (next: boolean) => {
    if (!requestId || pendingRef.current) return;
    const requestParams = next ? normalizedOnParams : normalizedOffParams;
    if (!requestParams) return;
    pendingRef.current = true;
    const previous = checked;
    setChecked(next);
    try {
      const result = await execute(requestId, requestParams, false);
      if (!result.ok) {
        setChecked(previous);
        showErrorNotification({
          title: label ?? t("toggle"),
          message: errorMessage ?? result.error ?? t("requestFailed"),
        });
        return;
      }
      await invalidateAfterAction(utils, itemId, previewSessionId, invalidate);
    } catch {
      setChecked(previous);
      showErrorNotification({
        title: label ?? t("toggle"),
        message: errorMessage ?? t("requestFailed"),
      });
    } finally {
      pendingRef.current = false;
    }
  };

  if (!requestId) return <MigrationRequiredAlert />;
  return (
    <Switch
      label={label}
      color={color}
      size={size as never}
      checked={checked}
      onChange={(event) => void handleChange(event.currentTarget.checked)}
      disabled={
        parseBool(disabled) || isPending || isEditMode || !canExecute || !normalizedOnParams || !normalizedOffParams
      }
    />
  );
}

export interface RefreshButtonProps {
  label?: string;
  color?: string;
  variant?: string;
  size?: string;
}

export function RefreshButton({ label, color = "blue", variant = "light", size = "sm" }: RefreshButtonProps) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const { itemId, previewSessionId, isEditMode } = useCustomJsxRuntime();
  const utils = clientApi.useUtils();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    if (!itemId && !previewSessionId) return;
    setLoading(true);
    try {
      if (previewSessionId) await utils.customWidget.previewQuery.invalidate();
      else
        await Promise.all([
          utils.widget.customApi.getData.invalidate({ itemId: itemId ?? "" }),
          utils.widget.customApi.queryRequest.invalidate(),
        ]);
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
      disabled={(!itemId && !previewSessionId) || isEditMode}
    >
      {label ?? t("refresh")}
    </Button>
  );
}
