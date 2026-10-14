import { Button, Group, NumberInput, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { sourceControlInputSchema } from "../../contracts/schemas";
import type { SourceControlInput } from "../../contracts/schemas";
import type { WidgetSlotProps } from "../../contracts/ui";
import { createFixtureQueryUtils } from "../../server/api/client";
import {
  captureSessionTransition,
  isSessionTransitionCurrent,
  useSessionTransition,
} from "../session/session-transition";
import { hideWidgetAccess, isWidgetAccessDenied } from "./access";

export function SourceControls({ snapshot, client, queryClient }: WidgetSlotProps) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<number | string>(snapshot.data?.value ?? 42);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const blocked = useSessionTransition(queryClient);
  const queries = useMemo(() => createFixtureQueryUtils(client), [client]);

  useEffect(() => {
    setMounted(true);
    return () => {
      const controller = pending.current;
      pending.current = null;
      controller?.abort();
    };
  }, []);

  async function changeSource(input: SourceControlInput): Promise<void> {
    if (!mounted || blocked || pending.current) return;
    const epoch = captureSessionTransition(queryClient);
    if (epoch === null) return;
    const parsed = sourceControlInputSchema.safeParse(input);
    if (!parsed.success) {
      setFailed(true);
      setMessage("Enter a finite value from 0 to 1,000,000 items.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 5000);
    setBusy(true);
    setFailed(false);
    setMessage(null);
    try {
      await queryClient.cancelQueries({ queryKey: queries.widget.key() });
      controller.signal.throwIfAborted();
      if (!isSessionTransitionCurrent(queryClient, epoch)) return;
      const result = await client.source.control(parsed.data, { signal: controller.signal });
      controller.signal.throwIfAborted();
      if (!isSessionTransitionCurrent(queryClient, epoch)) return;
      setMessage(
        result.mode === "healthy"
          ? "Source value updated. The next accepted observation advances the widget generation."
          : result.mode === "error"
            ? "Source errors enabled. Existing observations stay visible only within the stale limit."
            : "Source delay enabled, longer than the widget deadline.",
      );
      await queryClient.invalidateQueries({ queryKey: queries.widget.key() }, { throwOnError: true });
    } catch (error) {
      if (!isSessionTransitionCurrent(queryClient, epoch)) return;
      if (!controller.signal.aborted && isWidgetAccessDenied(error)) {
        hideWidgetAccess(queryClient, client, epoch);
        return;
      }
      if (pending.current === controller && !controller.signal.aborted) {
        setFailed(true);
        setMessage("Source control or refresh could not be confirmed. Retry or restore the healthy source.");
      } else if (pending.current === controller && mounted) {
        setFailed(true);
        setMessage("Source control timed out. Its outcome is unknown; restore the healthy source to retry.");
      }
    } finally {
      window.clearTimeout(timer);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  const validValue = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000;
  return (
    <details>
      <Text component="summary" size="sm" fw={600} style={{ cursor: "pointer" }}>
        Synthetic source controls
      </Text>
      <Stack gap="sm" pt="sm">
        <Text size="sm">Owner-only fixture controls. Both boards read the same synthetic source.</Text>
        <NumberInput
          label="Source value (items)"
          value={value}
          onChange={setValue}
          min={0}
          max={1000000}
          disabled={!mounted || busy || blocked}
        />
        <Group gap="sm" wrap="wrap">
          <Button
            disabled={!mounted || busy || blocked || !validValue}
            loading={busy}
            onClick={() => {
              if (typeof value === "number") void changeSource({ mode: "healthy", value });
            }}
          >
            Set healthy source
          </Button>
          <Button
            variant="default"
            disabled={!mounted || busy || blocked}
            onClick={() => void changeSource({ mode: "error" })}
          >
            Simulate source error
          </Button>
          <Button
            variant="default"
            disabled={!mounted || busy || blocked}
            onClick={() => void changeSource({ mode: "timeout" })}
          >
            Simulate timeout
          </Button>
        </Group>
        {message && (
          <Text size="sm" c={failed ? "red.9" : undefined} role={failed ? "alert" : "status"}>
            {message}
          </Text>
        )}
      </Stack>
    </details>
  );
}
