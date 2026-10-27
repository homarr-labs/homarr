import { IconCheck, IconMinus, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { RouterInputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  input: RouterInputs["widget"]["app"]["ping"];
}

export const PingIndicator = ({ input }: PingIndicatorProps) => {
  const t = useI18n("common");
  const { data: pingResult, error } = clientApi.widget.app.ping.useQuery(input, { refetchOnMount: false });

  if (error) return <PingDot icon={IconX} color="red" tooltip={t("error")} />;

  if (!pingResult) return <PingDot icon={IconMinus} color="gray" tooltip={`${t("action.loading")}…`} />;

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
