import { Alert, Box, Button, Skeleton, Stack, Text, VisuallyHidden } from "@mantine/core";
import type { ComponentType } from "react";
import { useId } from "react";

import type { ProviderProps } from "../../contracts/providers";
import { SourceChrome } from "../../source-ui/chrome/shell";
import type { SourceChromeProps } from "../../source-ui/chrome/contracts";
import classes from "./global-tools.module.css";

export type GlobalToolSignal =
  | { readonly kind: "ready" }
  | { readonly kind: "pending"; readonly message: string }
  | {
      readonly kind: "error";
      readonly title: string;
      readonly message: string;
      readonly retry?: { readonly label: string; readonly run: () => void };
    }
  | { readonly kind: "unavailable"; readonly message: string };

export interface GlobalToolSlotProps extends Omit<ProviderProps, "children"> {
  readonly signal: GlobalToolSignal;
  readonly sessionBlocked: boolean;
}

export interface GlobalToolSlots {
  readonly Search: ComponentType<GlobalToolSlotProps>;
  readonly Assistant: ComponentType<GlobalToolSlotProps>;
  readonly Operations: ComponentType<GlobalToolSlotProps>;
}

export function freezeGlobalToolSlots(slots: GlobalToolSlots): GlobalToolSlots {
  return Object.freeze({ Search: slots.Search, Assistant: slots.Assistant, Operations: slots.Operations });
}

export interface GlobalToolsChromeProps extends ProviderProps {
  readonly slots: GlobalToolSlots;
  readonly signals: {
    readonly search: GlobalToolSignal;
    readonly assistant: GlobalToolSignal;
    readonly operations: GlobalToolSignal;
  };
  readonly chrome: Omit<SourceChromeProps, "children" | "mainId" | "direction" | "sessionBlocked" | "header"> & {
    readonly header: Omit<SourceChromeProps["header"], "spotlight">;
  };
  readonly sessionBlocked: boolean;
  readonly labels: {
    readonly skipToContent: string;
    readonly tools: string;
    readonly navigation: string;
    readonly sessionTransition: string;
  };
}

export function GlobalToolsChrome({
  snapshot,
  queryClient,
  children,
  slots,
  signals,
  chrome,
  sessionBlocked,
  labels,
}: GlobalToolsChromeProps) {
  const mainId = useId();
  const slotProps = { snapshot, queryClient, sessionBlocked };

  return (
    <>
      <a href={`#${mainId}`} className={classes.skipLink}>
        {labels.skipToContent}
      </a>
      <SourceChrome
        {...chrome}
        header={{ ...chrome.header, spotlight: <slots.Search {...slotProps} signal={signals.search} /> }}
        mainId={mainId}
        direction={snapshot.direction}
        sessionBlocked={sessionBlocked}
      >
        {children}
      </SourceChrome>
      <Box component="section" aria-label={labels.tools} dir={snapshot.direction} inert={sessionBlocked}>
        <slots.Assistant {...slotProps} signal={signals.assistant} />
        <slots.Operations {...slotProps} signal={signals.operations} />
      </Box>
      <VisuallyHidden component="output" aria-live="polite" aria-atomic="true">
        {sessionBlocked ? labels.sessionTransition : null}
      </VisuallyHidden>
    </>
  );
}

export function GlobalToolFeedback({ signal, sessionBlocked }: Pick<GlobalToolSlotProps, "signal" | "sessionBlocked">) {
  if (signal.kind === "ready") return null;
  if (signal.kind === "pending") {
    return (
      <Stack gap="xs" aria-busy="true">
        <VisuallyHidden component="output">{signal.message}</VisuallyHidden>
        <Skeleton height={36} width="100%" />
      </Stack>
    );
  }
  if (signal.kind === "unavailable") return <Text size="sm">{signal.message}</Text>;

  return (
    <Alert title={signal.title} color="red" role="alert">
      <Stack gap="xs">
        <Text size="sm">{signal.message}</Text>
        {signal.retry ? (
          <Button variant="light" color="red" disabled={sessionBlocked} onClick={signal.retry.run}>
            {signal.retry.label}
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}
