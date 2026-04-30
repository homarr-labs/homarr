import { useEffect, useState } from "react";
import { IconCheck, IconLoader, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const query = clientApi.widget.app.ping.useQuery(
    { id: appId },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["ping"] | null>(query.data ?? null);

  useEffect(() => {
    if (query.data) setPingResult(query.data);
  }, [query.data]);

  clientApi.widget.app.updatedPing.useSubscription(
    { id: appId },
    {
      onData(data) {
        setPingResult(data);
      },
    },
  );

  // Apps without a server-pingable URL (e.g. path-only href without an explicit
  // pingUrl) yield a CONFLICT. Render an indeterminate dot for that case so the
  // card stays usable. Other tRPC errors (FORBIDDEN, NOT_FOUND) still bubble to
  // the widget error boundary as before.
  if (query.error) {
    if (query.error.data?.code === "CONFLICT") {
      return <PingDot icon={IconLoader} color="blue" tooltip={query.error.message} />;
    }
    throw query.error as unknown as Error;
  }

  if (!pingResult) {
    return <PingDot icon={IconLoader} color="blue" tooltip="Pinging…" />;
  }

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
