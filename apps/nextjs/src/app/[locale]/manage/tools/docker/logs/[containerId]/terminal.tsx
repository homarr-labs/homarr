"use client";

import { useCallback, useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { clientApi } from "@homarr/api/client";

import classes from "./terminal.module.css";

interface DockerLogsTerminalProps {
  containerId: string;
}

export const DockerLogsTerminal = ({ containerId }: DockerLogsTerminalProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const pendingLogsRef = useRef<string[]>([]);
  const isTerminalReadyRef = useRef(false);

  const writeToTerminal = useCallback((data: string) => {
    if (!isTerminalReadyRef.current || !terminalRef.current) {
      pendingLogsRef.current.push(data);
      return;
    }

    terminalRef.current.write(data);
    terminalRef.current.refresh(0, terminalRef.current.rows - 1);
  }, []);

  clientApi.docker.subscribeLogs.useSubscription(
    { id: containerId, tail: 200 },
    {
      onData: writeToTerminal,
      onError(err) {
        writeToTerminal(`\r\n\x1b[31m${err.message}\x1b[0m`);
      },
    },
  );

  useEffect(() => {
    if (!ref.current) {
      return () => undefined;
    }

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      fontSize: 14,
    });
    terminal.open(ref.current);
    terminal.loadAddon(fitAddon);
    terminalRef.current = terminal;

    isTerminalReadyRef.current = true;
    pendingLogsRef.current.forEach((data) => terminal.write(data));
    pendingLogsRef.current = [];
    terminal.refresh(0, terminal.rows - 1);

    const fitTimeout = setTimeout(() => fitAddon.fit());

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(ref.current);

    return () => {
      clearTimeout(fitTimeout);
      resizeObserver.disconnect();
      isTerminalReadyRef.current = false;
      pendingLogsRef.current = [];
      fitAddon.dispose();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [writeToTerminal]);

  return <Box ref={ref} className={classes.outerTerminal} h="100%" />;
};
