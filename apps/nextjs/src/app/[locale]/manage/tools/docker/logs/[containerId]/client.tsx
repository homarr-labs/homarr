"use client";

import dynamic from "next/dynamic";

export const ClientSideDockerLogsTerminal = dynamic(
  () => import("./terminal").then(({ DockerLogsTerminal }) => DockerLogsTerminal),
  {
    ssr: false,
  },
);
