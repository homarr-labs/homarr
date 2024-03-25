"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "xterm";

import { clientApi } from "@homarr/api/client";

export default function TerminalComponent() {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal>(new Terminal({
    cursorBlink: false,
    disableStdin: true,
  }));

  clientApi.log.subscribe.useSubscription(undefined, {
    onData(data) {
      console.log('received data', data);
      terminalRef.current.writeln(data);
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

    terminalRef.current.open(ref.current);

    return () => {
      terminalRef.current.dispose();
    };
  }, []);
  return <div ref={ref} id="terminal"></div>;
}
