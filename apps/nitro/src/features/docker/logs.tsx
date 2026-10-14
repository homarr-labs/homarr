import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Group, NumberInput, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

import { useI18n } from "@homarr/translation/standalone/client";

import type { DockerFeatureBinding } from "./binding";
import type { DockerContainer } from "./client";
import { DockerLoadError } from "./feedback";
import { createDockerLogSession } from "./log-session";
import type { DockerLogState } from "./log-session";
import classes from "./docker.module.css";
import "@xterm/xterm/css/xterm.css";

type LogMode = "live" | "history";
type LogViewState = DockerLogState | { kind: "loadingTerminal" } | { kind: "loadingHistory" } | { kind: "history" };

export function DockerLogsPage({
  binding,
  container,
  onBack,
}: {
  binding: DockerFeatureBinding;
  container: DockerContainer;
  onBack: () => void;
}) {
  const t = useI18n();
  const [mode, setMode] = useState<LogMode>(binding.logStreaming.kind === "admitted" ? "live" : "history");
  const [tail, setTail] = useState<string | number>(200);
  const [request, setRequest] = useState({ tail: 200, revision: 0 });
  const validTail = typeof tail === "number" && Number.isInteger(tail) && tail >= 1 && tail <= 1000;
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{t("docker.action.logs.page.title", { name: container.name })}</Title>
        <Button variant="default" onClick={onBack}>
          Back to containers
        </Button>
      </Group>
      <Text size="sm">
        {container.endpointName}: {container.id}
      </Text>
      {binding.logStreaming.kind === "held" && (
        <Alert color="yellow" title="Live logs are held">
          {binding.logStreaming.reason}
        </Alert>
      )}
      <Group align="end">
        <SegmentedControl
          value={mode}
          onChange={(value) => {
            if (value === "history" || (value === "live" && binding.logStreaming.kind === "admitted")) setMode(value);
          }}
          data={[
            { value: "live", label: "Live logs", disabled: binding.logStreaming.kind !== "admitted" },
            { value: "history", label: "Log history" },
          ]}
        />
        <NumberInput
          label="Tail lines"
          value={tail}
          onChange={setTail}
          min={1}
          max={1000}
          allowDecimal={false}
          allowNegative={false}
          w={150}
        />
        <Button
          disabled={!validTail}
          onClick={() => {
            if (validTail) setRequest((current) => ({ tail, revision: current.revision + 1 }));
          }}
        >
          Load logs
        </Button>
      </Group>
      <Text size="sm">
        Live logs request their own history tail. Switching views replaces the terminal; snapshots and live history are
        never concatenated or deduplicated.
      </Text>
      <DockerLogsTerminal
        key={`${container.resourceId}:${mode}:${request.tail}:${request.revision}`}
        binding={binding}
        container={container}
        mode={mode}
        tail={request.tail}
      />
    </Stack>
  );
}

function DockerLogsTerminal({
  binding,
  container,
  mode,
  tail,
}: {
  binding: DockerFeatureBinding;
  container: DockerContainer;
  mode: LogMode;
  tail: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const session = useRef<ReturnType<typeof createDockerLogSession> | null>(null);
  const [state, setState] = useState<LogViewState>({ kind: "loadingTerminal" });
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    let active = true;
    let localTerminal: Terminal | undefined;
    let localSession: ReturnType<typeof createDockerLogSession> | undefined;
    const historyController = new AbortController();
    const input = { endpointId: container.endpointId, id: container.id, tail };
    const initialize = async () => {
      try {
        const [{ Terminal: XTerm }, { CanvasAddon }, { FitAddon: Fit }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-canvas"),
          import("@xterm/addon-fit"),
        ]);
        if (!active) return;
        localTerminal = new XTerm({
          cursorBlink: false,
          disableStdin: true,
          convertEol: true,
          fontSize: 14,
          screenReaderMode: true,
        });
        terminal.current = localTerminal;
        localTerminal.open(target);
        localTerminal.loadAddon(new CanvasAddon());
        const fitAddon = new Fit();
        localTerminal.loadAddon(fitAddon);
        fit.current = fitAddon;
        fitAddon.fit();
        const output = localTerminal;
        if (mode === "history") {
          setState({ kind: "loadingHistory" });
          const history = await binding.client.docker.logs(input, { signal: historyController.signal });
          if (!active) return;
          output.write(history.logs);
          setState({ kind: "history" });
          return;
        }
        if (binding.logStreaming.kind !== "admitted") throw new Error("Native Docker log cleanup binding is held");
        localSession = createDockerLogSession(binding.client, input, {
          onChunk(chunk) {
            if (active) output.write(chunk);
          },
          onState(next) {
            if (active) setState(next);
          },
        });
        session.current = localSession;
      } catch (error) {
        if (active) setState({ kind: "error", error });
      }
    };
    void initialize();
    return () => {
      active = false;
      historyController.abort();
      void localSession?.stop();
      session.current = null;
      fit.current = null;
      terminal.current = null;
      localTerminal?.dispose();
    };
  }, [binding.client, binding.logStreaming.kind, container.endpointId, container.id, mode, tail]);
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text component="output" size="sm">
          {logStateLabel(state)}
        </Text>
        <Group>
          <Button variant="default" size="xs" disabled={!terminal.current} onClick={() => fit.current?.fit()}>
            Fit terminal
          </Button>
          <Button
            variant="default"
            size="xs"
            disabled={state.kind !== "streaming" && state.kind !== "connecting"}
            onClick={() => {
              void session.current?.stop();
            }}
          >
            Stop live logs
          </Button>
        </Group>
      </Group>
      {state.kind === "error" && <DockerLoadError error={state.error} />}
      {state.kind === "stopped" && (
        <Text size="sm">
          The browser request/iterator ended. This is not an attestation of native Docker stream or host cleanup.
        </Text>
      )}
      <Box ref={element} className={classes.terminal} aria-label={`${container.name} Docker logs`} />
    </Stack>
  );
}

function logStateLabel(state: LogViewState) {
  if (state.kind === "loadingTerminal") return "Loading terminal";
  if (state.kind === "loadingHistory") return "Loading log history";
  if (state.kind === "history") return "Log history loaded";
  if (state.kind === "connecting") return "Connecting to live logs";
  if (state.kind === "streaming") return "Receiving live logs";
  if (state.kind === "stopping") return "Cancellation requested; awaiting browser iterator return";
  if (state.kind === "stopped") return "Browser log request ended";
  if (state.kind === "ended") return "Log iterator ended";
  return "Log request failed";
}
