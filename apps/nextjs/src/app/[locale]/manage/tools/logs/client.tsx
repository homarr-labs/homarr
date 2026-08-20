"use client";

import dynamic from "next/dynamic";

interface ClientSideTerminalComponentProps {
  focusTimestamp?: number;
}

export const ClientSideTerminalComponent = dynamic<ClientSideTerminalComponentProps>(
  () => import("./terminal").then(({ TerminalComponent }) => TerminalComponent),
  {
    ssr: false,
  },
);
