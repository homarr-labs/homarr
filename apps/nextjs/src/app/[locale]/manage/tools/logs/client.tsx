"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";

interface ClientSideTerminalComponentProps {
  focusTimestamp?: number;
}

export const ClientSideTerminalComponent = dynamic(
  () => import("./terminal").then(({ TerminalComponent }) => TerminalComponent),
  {
    ssr: false,
  },
) as ComponentType<ClientSideTerminalComponentProps>;
