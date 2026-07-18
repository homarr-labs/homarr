"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Switch } from "@mantine/core";
import { IconCheck, IconPlayerPlay, IconPower, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";

import { useCustomWidgetRuntime } from "./context";
import { normalizeParams } from "./data";
import { RequestIdRequiredAlert } from "./status";
import type { CustomJsxRuntimeParams, CustomWidgetRequestResult } from "./types";

const ICON_MAP: Record<string, ComponentType<{ size?: number | string }>> = {
  play: IconPlayerPlay,
  check: IconCheck,
  refresh: IconRefresh,
  power: IconPower,
  trash: IconTrash,
};

function parseBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function useActionExecutor() {
  const runtime = useCustomWidgetRuntime();
  const mutation = useMutation({
    mutationFn: ({
      requestId,
      params,
      confirmed,
    }: {
      requestId: string;
      params: CustomJsxRuntimeParams;
      confirmed: boolean;
    }): Promise<CustomWidgetRequestResult> => {
      if (!runtime.itemId && !runtime.previewSessionId) {
        return Promise.resolve({ ok: false, status: 0, data: null, error: runtime.messages.widgetItemUnavailable });
      }
      if (runtime.isEditMode) {
        return Promise.resolve({ ok: false, status: 0, data: null, error: runtime.messages.actionsDisabledEditMode });
      }
      return runtime.port.executeAction({
        itemId: runtime.itemId,
        previewSessionId: runtime.previewSessionId,
        requestId,
        params,
        confirmed,
      });
    },
  });
  return { runtime, mutation };
}

export interface ActionButtonProps {
  requestId?: string;
  params?: CustomJsxRuntimeParams;
  label?: string;
  children?: ReactNode;
  color?: string;
  variant?: string;
  size?: string;
  confirmMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  icon?: string;
  disabled?: boolean | string;
  fullWidth?: boolean | string;
}

export function ActionButton(props: ActionButtonProps) {
  const { runtime, mutation } = useActionExecutor();
  const params = normalizeParams(props.params);
  const title = props.label ?? (typeof props.children === "string" ? props.children : props.requestId) ?? "Action";
  const Icon = props.icon ? ICON_MAP[props.icon.toLowerCase()] : undefined;
  const capability = runtime.requestCapabilities.find(
    (candidate) => candidate.id === props.requestId && candidate.kind === "action",
  );
  const run = async (confirmed: boolean) => {
    if (!props.requestId || !params) return;
    try {
      const result = await mutation.mutateAsync({ requestId: props.requestId, params, confirmed });
      const success = result.ok;
      runtime.port.notify({
        kind: success ? "success" : "error",
        title,
        message: success
          ? (props.successMessage ??
            (result.simulated ? runtime.messages.actionSimulated : runtime.messages.actionCompleted))
          : (props.errorMessage ?? result.error ?? `${runtime.messages.requestFailed} (${result.status})`),
      });
      if (success)
        await runtime.port.invalidate({
          itemId: runtime.itemId,
          previewSessionId: runtime.previewSessionId,
          targets: result.invalidates ?? capability?.invalidates ?? [],
        });
    } catch {
      runtime.port.notify({
        kind: "error",
        title,
        message: props.errorMessage ?? runtime.messages.requestFailed,
      });
    }
  };
  const click = async () => {
    const confirmMessage =
      props.confirmMessage ??
      capability?.confirmation?.message ??
      (capability?.method === "DELETE" ? runtime.messages.confirmDelete : undefined);
    if (
      confirmMessage &&
      !(await runtime.port.confirm({
        title: capability?.confirmation?.title ?? title,
        message: confirmMessage,
        confirmLabel: capability?.confirmation?.confirmLabel,
        destructive: capability?.confirmation?.destructive ?? capability?.method === "DELETE",
      }))
    )
      return;
    await run(Boolean(confirmMessage));
  };
  if (!props.requestId) return <RequestIdRequiredAlert />;
  return (
    <Button
      color={props.color ?? "blue"}
      variant={(props.variant ?? "filled") as never}
      size={(props.size ?? "sm") as never}
      onClick={() => void click()}
      loading={mutation.isPending}
      leftSection={Icon ? <Icon size={16} /> : undefined}
      disabled={
        parseBool(props.disabled) || runtime.isEditMode || (!runtime.itemId && !runtime.previewSessionId) || !params
      }
      fullWidth={parseBool(props.fullWidth)}
    >
      {props.children ?? props.label ?? props.requestId}
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
  disabled?: boolean | string;
}

export function ToggleSwitch(props: ToggleSwitchProps) {
  const { runtime, mutation } = useActionExecutor();
  const initial = parseBool(props.initialValue);
  const [checked, setChecked] = useState(initial);
  const locked = useRef(false);
  const onParams = normalizeParams(props.onParams);
  const offParams = normalizeParams(props.offParams);
  const capability = runtime.requestCapabilities.find(
    (candidate) => candidate.id === props.requestId && candidate.kind === "action",
  );
  useEffect(() => {
    if (!locked.current) setChecked(initial);
  }, [initial]);
  const change = async (next: boolean) => {
    const params = next ? onParams : offParams;
    if (!props.requestId || !params || locked.current) return;
    const confirmation = capability?.confirmation;
    const confirmMessage =
      confirmation?.message ?? (capability?.method === "DELETE" ? runtime.messages.confirmDelete : undefined);
    if (
      confirmMessage &&
      !(await runtime.port.confirm({
        title: confirmation?.title ?? props.label ?? runtime.messages.toggle,
        message: confirmMessage,
        confirmLabel: confirmation?.confirmLabel,
        destructive: confirmation?.destructive ?? capability?.method === "DELETE",
      }))
    )
      return;
    locked.current = true;
    const previous = checked;
    setChecked(next);
    try {
      const result = await mutation.mutateAsync({
        requestId: props.requestId,
        params,
        confirmed: confirmMessage !== undefined,
      });
      if (!result.ok) {
        setChecked(previous);
        runtime.port.notify({
          kind: "error",
          title: props.label ?? runtime.messages.toggle,
          message: props.errorMessage ?? result.error ?? runtime.messages.requestFailed,
        });
      } else {
        await runtime.port.invalidate({
          itemId: runtime.itemId,
          previewSessionId: runtime.previewSessionId,
          targets: result.invalidates ?? capability?.invalidates ?? [],
        });
      }
    } catch {
      setChecked(previous);
      runtime.port.notify({
        kind: "error",
        title: props.label ?? runtime.messages.toggle,
        message: props.errorMessage ?? runtime.messages.requestFailed,
      });
    } finally {
      locked.current = false;
    }
  };
  if (!props.requestId) return <RequestIdRequiredAlert />;
  return (
    <Switch
      label={props.label}
      color={props.color ?? "blue"}
      size={(props.size ?? "sm") as never}
      checked={checked}
      onChange={(event) => void change(event.currentTarget.checked)}
      disabled={
        parseBool(props.disabled) ||
        mutation.isPending ||
        runtime.isEditMode ||
        (!runtime.itemId && !runtime.previewSessionId) ||
        !onParams ||
        !offParams
      }
    />
  );
}
