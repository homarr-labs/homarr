"use client";

import { useEffect, useRef } from "react";
import { CanvasAddon } from "@xterm/addon-canvas";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "xterm-addon-fit";

import { clientApi } from "@homarr/api/client";
import { Box } from "@homarr/ui";

import classes from "./terminal.module.css";

export default function TerminalComponent() {
  const ref = useRef<HTMLDivElement>(null);

  const terminalRef = useRef<Terminal>();
  clientApi.log.subscribe.useSubscription(undefined, {
    onData(data) {
      terminalRef.current?.writeln(
        `${data.timestamp} ${data.level} ${data.message}`,
      );
      terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
    },
    onError(err) {
      alert(err);
    },
  });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const canvasAddon = new CanvasAddon();

    terminalRef.current = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
    });
    terminalRef.current.open(ref.current);
    terminalRef.current.loadAddon(canvasAddon);

    // This is a hack to make sure the terminal is rendered before we try to fit it
    // You can blame @Meierschlumpf for this
    setTimeout(() => {
      const fitAddon = new FitAddon();
      terminalRef.current?.loadAddon(fitAddon);
      fitAddon.fit();
    });

    return () => {
      terminalRef.current?.dispose();
      canvasAddon.dispose();
    };
  }, []);
  return (
    <Box
      ref={ref}
      id="terminal"
      className={classes.outerTerminal}
      h="100%"
    ></Box>
  );
}
