import { useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const [ping] = clientApi.widget.app.ping.useSuspenseQuery(
    {
      id: appId,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["ping"]>(ping);

  clientApi.widget.app.updatedPing.useSubscription(
    { id: appId },
    {
      onData(data) {
        setPingResult(data);
      },
    },
  );

  const isError = "error" in pingResult || pingResult.statusCode >= 500;

  return (
    <PingDot
      icon={isError ? IconX : IconCheck}
      color={isError ? "red" : "green"}
      tooltip={
        "statusCode" in pingResult
          ? `${pingResult.statusCode} - ${pingResult.durationMs.toFixed(0)}ms`
          : pingResult.error
      }
    />
  );
};
