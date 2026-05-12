import { IconCheck, IconLoader, IconMinus, IconX } from "@tabler/icons-react";
import { TRPCClientError } from "@trpc/client";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const t = useI18n();
  const { data: pingResult, error } = clientApi.widget.app.ping.useQuery({ id: appId }, { refetchOnMount: false });

  // Apps without a server-pingable URL (e.g. a path-only href without an
  // explicit pingUrl) yield a CONFLICT. Show an indeterminate orange dot for
  // that case so the card stays usable instead of a perpetual loading state.
  if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
    return <PingDot icon={IconLoader} color="orange" tooltip={error.message} />;
  }

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
