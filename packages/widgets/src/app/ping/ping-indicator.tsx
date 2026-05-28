import { IconCheck, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const { data: pingResult } = clientApi.widget.app.ping.useQuery(
    { id: appId },
    { refetchOnMount: false, refetchOnWindowFocus: false },
  );

  const utils = clientApi.useUtils();
  clientApi.widget.app.updatedPing.useSubscription(
    { id: appId },
    {
      onData(data) {
        utils.widget.app.ping.setData({ id: appId }, data);
      },
    },
  );

  if (!pingResult) return null;

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
