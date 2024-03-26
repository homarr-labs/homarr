"use client";

import { useEffect, useRef } from "react";
import { CanvasAddon } from "@xterm/addon-canvas";
import { Terminal } from "@xterm/xterm";

import { clientApi } from "@homarr/api/client";

export default function TerminalComponent() {
  const ref = useRef<HTMLDivElement>(null);
  const renderedBeforeRef = useRef<boolean>(false);

  const terminalRef = useRef<Terminal>(
    new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
    }),
  );

  clientApi.log.subscribe.useSubscription(undefined, {
    onData(data) {
      terminalRef.current.writeln(
        `${data.timestamp} ${data.level} ${data.message}`,
      );
      terminalRef.current.refresh(0, terminalRef.current.rows - 1);
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

    if (terminalRef.current.element) {
      return;
    }

    terminalRef.current.open(ref.current);
    terminalRef.current.loadAddon(canvasAddon);

    return () => {
      if (renderedBeforeRef.current) {
        terminalRef.current.dispose();
        canvasAddon.dispose();
      }
      renderedBeforeRef.current = true;
    };
  }, []);
  return (
    <div
      ref={ref}
      id="terminal"
      style={{ height: 400, backgroundColor: "red" }}
    ></div>
  );
}
