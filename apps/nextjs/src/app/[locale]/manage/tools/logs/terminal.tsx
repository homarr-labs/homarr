"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { CanvasAddon } from "@xterm/addon-canvas";
import { FitAddon } from "@xterm/addon-fit";

import { clientApi } from "@homarr/api/client";

export default function TerminalComponent() {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal>(new Terminal({
    cursorBlink: false,
    disableStdin: true,
    convertEol: true,
  }));

  clientApi.log.subscribe.useSubscription(undefined, {
    onData(data) {
      terminalRef.current.writeln(`${data.timestamp} ${data.level} ${data.message}`);
      terminalRef.current.refresh(0, terminalRef.current.rows - 1);
    },
    onError(err) {
      alert(err);
    }
  });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // const fitAddon = new FitAddon();
    // const canvasAddon = new CanvasAddon();
    // terminalRef.current.loadAddon(fitAddon);

    if (terminalRef.current.element) {
      return;
    }

    terminalRef.current.open(ref.current);
    
    // terminalRef.current.loadAddon(canvasAddon);

    // fitAddon.fit();

    console.log('created on ref', ref.current);

    return () => {
      // terminalRef.current.dispose();
      console.log('disposed');
      // fitAddon.dispose();
      // canvasAddon.dispose();
    };
  }, []);
  return <div ref={ref} id="terminal" style={{ height: 400, backgroundColor: 'red' }}></div>;
}
