"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Group, MantineThemeProvider, Stack, Text, TextInput, Title, useMantineTheme } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import type { WorkerConnection } from "@homarr/worker-client";

import classes from "./worker-settings.module.css";

const connectionKeys = new WeakMap<WorkerConnection, number>();
let nextConnectionKey = 0;

/** Keep accessible worker control colors local, including installations with a custom primary palette. */
export function WorkerConsoleAppearance({ children }: { children: ReactNode }) {
  const theme = useMantineTheme();
  let primaryForeground = "light-dark(var(--mantine-color-gray-8), var(--mantine-color-dark-0))";
  if (theme.primaryColor === "red") {
    primaryForeground = "light-dark(var(--mantine-color-red-9), var(--mantine-color-red-3))";
  }
  const variables = {
    "--worker-primary-foreground": primaryForeground,
    [`--mantine-color-${theme.primaryColor}-filled`]: "var(--mantine-primary-color-9)",
    [`--mantine-color-${theme.primaryColor}-filled-hover`]: "var(--mantine-primary-color-8)",
    [`--mantine-color-${theme.primaryColor}-light-color`]: "var(--worker-primary-foreground)",
  } as CSSProperties;
  return (
    <MantineThemeProvider theme={{ primaryShade: 9, autoContrast: true, luminanceThreshold: 0.179 }}>
      <div className={classes.console} style={variables}>
        {children}
      </div>
    </MantineThemeProvider>
  );
}

export function workerConnectionKey(connection: WorkerConnection) {
  let key = connectionKeys.get(connection);
  if (key === undefined) {
    key = ++nextConnectionKey;
    connectionKeys.set(connection, key);
  }
  return key;
}

export function InlinePanel({ title, children }: { title: string; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className={classes.inlinePanel} aria-label={title}>
      <Stack gap="md">
        <Title order={4} ref={heading} tabIndex={-1} className={classes.panelHeading}>
          {title}
        </Title>
        {children}
      </Stack>
    </section>
  );
}

export function InlineConfirmation({
  title,
  description,
  action,
  busy,
  onCancel,
  onConfirm,
  error,
}: {
  title: string;
  description: string;
  action: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  error?: string;
}) {
  return (
    <InlinePanel title={title}>
      <Text size="sm" className={classes.prose}>
        {description}
      </Text>
      {error && (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      )}
      <Group gap="sm">
        <Button color="red" size="sm" loading={busy} onClick={onConfirm}>
          {action}
        </Button>
        <Button variant="default" size="sm" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </Group>
    </InlinePanel>
  );
}

/** Fetch secrets only on demand and keep a selectable fallback when clipboard permission is unavailable. */
export function WorkerCopyButton({
  value,
  loadValue,
  label = "Copy link",
  disabled = false,
  variant = "default",
}: {
  value?: string;
  loadValue?: (signal: AbortSignal) => Promise<string>;
  label?: string;
  disabled?: boolean;
  variant?: "default" | "subtle";
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState("");
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    setCopied(false);
    setFallback("");
    setError("");
    setBusy(false);
    operation.current?.abort();
    operation.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, [value]);

  async function copy() {
    if (disabled || busy) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    setCopied(false);
    let text = value || fallback;
    try {
      if (!text && loadValue) text = await loadValue(controller.signal);
      controller.signal.throwIfAborted();
      if (!text) throw new Error("This link is unavailable. Refresh and try again.");
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        if (mounted.current && !controller.signal.aborted) {
          setFallback(text);
          setError("Select the link below, or try Copy again.");
        }
        return;
      }
      if (!mounted.current || controller.signal.aborted) return;
      setFallback("");
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2_000);
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        let message = "Could not retrieve this link. Refresh and try again.";
        if (cause instanceof Error) message = cause.message;
        setError(message);
      }
    } finally {
      if (mounted.current && !controller.signal.aborted && operation.current === controller) setBusy(false);
    }
  }

  let icon = <IconCopy size={16} />;
  let text = label;
  let accessibleLabel = label;
  if (copied) {
    icon = <IconCheck size={16} />;
    text = "Copied";
    accessibleLabel = `${label}: copied`;
  }
  return (
    <div className={classes.copyAction}>
      <Button
        variant={variant}
        size="sm"
        loading={busy}
        disabled={disabled}
        leftSection={icon}
        onClick={() => void copy()}
        aria-label={accessibleLabel}
        aria-live="polite"
      >
        {text}
      </Button>
      {error && (
        <Text size="xs" c="red" role="alert" maw={300}>
          {error}
        </Text>
      )}
      {fallback && (
        <TextInput
          aria-label={label}
          value={fallback}
          readOnly
          data-private="true"
          onFocus={(event) => event.currentTarget.select()}
          className={classes.copyFallback}
        />
      )}
    </div>
  );
}

export function WorkerCopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={classes.copyField}>
      <TextInput
        label={label}
        value={value}
        readOnly
        data-private="true"
        onFocus={(event) => event.currentTarget.select()}
        className={classes.copyInput}
      />
      <WorkerCopyButton value={value} label="Copy link" />
    </div>
  );
}
