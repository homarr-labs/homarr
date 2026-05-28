import { useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const { data: ping } = clientApi.widget.app.ping.useQuery(
    {
      id: appId,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["ping"] | undefined>(ping);

  clientApi.widget.app.updatedPing.useSubscription(
    { id: appId },
    {
      onData(data) {
        setPingResult(data);
      },
    },
  );

  const current = pingResult ?? ping;
  if (!current) return null;

  const isError = "error" in current || current.statusCode >= 500;

  return (
    <PingDot
      icon={isError ? IconX : IconCheck}
      color={isError ? "red" : "green"}
      tooltip={
        "statusCode" in current
          ? `${current.statusCode} - ${current.durationMs.toFixed(0)}ms`
          : current.error
      }
    />
  );
};
