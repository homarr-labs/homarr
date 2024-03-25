"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "xterm";

export default function TerminalComponent() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const terminal = new Terminal({
        cursorBlink: false,
        disableStdin: true
    });
    terminal.open(ref.current);

    const intervalId = setInterval(() => {
      terminal.write("TEST!");
    }, 300);

    console.log("created terminal");

    return () => {
      clearInterval(intervalId);
      terminal.dispose();
      console.log("disposed terminal");
    };
  }, []);
  return <div ref={ref} id="terminal"></div>;
}
