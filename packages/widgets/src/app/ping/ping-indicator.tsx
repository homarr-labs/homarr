import { IconCheck, IconMinus, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const t = useI18n();
  const { data: pingResult } = clientApi.widget.app.ping.useQuery({ id: appId }, { refetchOnMount: false });

  if (!pingResult) return <PingDot icon={IconMinus} color="gray" tooltip={`${t("common.action.loading")}…`} />;

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
