import { useState } from "react";
import { IconCheck, IconLoader, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  href: string;
}

export const PingIndicator = ({ href }: PingIndicatorProps) => {
  const t = useI18n();
  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["updatedPing"] | null>(null);

  clientApi.widget.app.updatedPing.useSubscription(
    { url: href },
    {
      onData(data) {
        setPingResult(data);
      },
    },
  );

  if (!pingResult) {
    return <PingDot icon={IconLoader} color="blue" tooltip={`${t("common.action.loading")}…`} />;
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
