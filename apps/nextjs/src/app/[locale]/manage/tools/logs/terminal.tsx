"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { CanvasAddon } from "@xterm/addon-canvas";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { clientApi } from "@homarr/api/client";

import { useLogContext } from "./log-context";
import classes from "./terminal.module.css";

export const TerminalComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { activeLevels, fontSize } = useLogContext();

  const terminalRef = useRef<Terminal>(null);
  const fitAddonRef = useRef<FitAddon>(null);

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

    const canvasAddon = new CanvasAddon();

    terminalRef.current = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      fontSize,
    });
    terminalRef.current.open(ref.current);
    terminalRef.current.loadAddon(canvasAddon);

    setTimeout(() => {
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      terminalRef.current?.loadAddon(fitAddon);
      fitAddon.fit();
    });

    return () => {
      canvasAddon.dispose();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.fontSize = fontSize;
    fitAddonRef.current?.fit();
  }, [fontSize]);

  return <Box ref={ref} id="terminal" className={classes.outerTerminal} h="100%"></Box>;
};
