import { IconCheck, IconLoader2, IconMinus, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSwitch } from "../docker/container-toggle";
import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
  containerSwitch?: ContainerSwitch | null;
}

export const PingIndicator = ({ appId, containerSwitch }: PingIndicatorProps) => {
  const t = useI18n("common");
  const tSwitch = useI18n("widget.app.docker.switch");
  const { data: pingResult, error } = clientApi.widget.app.ping.useQuery({ id: appId }, { refetchOnMount: false });

  if (containerSwitch) {
    return <PingDot icon={IconLoader2} color="orange" tooltip={tSwitch(containerSwitch)} />;
  }

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
