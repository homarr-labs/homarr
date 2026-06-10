"use client";

import { useCallback, useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { CanvasAddon } from "@xterm/addon-canvas";
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

    const canvasAddon = new CanvasAddon();

    terminalRef.current = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      fontSize: 14,
    });
    terminalRef.current.open(ref.current);
    terminalRef.current.loadAddon(canvasAddon);

    isTerminalReadyRef.current = true;
    const terminal = terminalRef.current;
    pendingLogsRef.current.forEach((data) => terminal.write(data));
    pendingLogsRef.current = [];
    terminal.refresh(0, terminal.rows - 1);

    setTimeout(() => {
      const fitAddon = new FitAddon();
      terminalRef.current?.loadAddon(fitAddon);
      fitAddon.fit();
    });

    return () => {
      isTerminalReadyRef.current = false;
      pendingLogsRef.current = [];
      canvasAddon.dispose();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, [writeToTerminal]);

  return <Box ref={ref} className={classes.outerTerminal} h="100%" />;
};
