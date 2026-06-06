"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { clientApi } from "@homarr/api/client";

import { useLogContext } from "./log-context";
import classes from "./terminal.module.css";

export const TerminalComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { activeLevels, fontSize } = useLogContext();

  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  clientApi.log.subscribe.useSubscription(
    {
      levels: activeLevels,
    },
    {
      onData(data) {
        terminalRef.current?.writeln(data.message);
        terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
      },
      onError(err) {
        alert(err);
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
      fontSize,
    });
    terminal.open(ref.current);
    terminal.loadAddon(fitAddon);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const fitTerminal = () => fitAddon.fit();
    const fitTimeout = setTimeout(fitTerminal);

    const resizeObserver = new ResizeObserver(fitTerminal);
    resizeObserver.observe(ref.current);

    return () => {
      clearTimeout(fitTimeout);
      resizeObserver.disconnect();
      fitAddon.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.fontSize = fontSize;
    fitAddonRef.current?.fit();
  }, [fontSize]);

  return <Box ref={ref} id="terminal" className={classes.outerTerminal} h="100%"></Box>;
};
