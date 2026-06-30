import { Suspense, useState } from "react";
import { IconCheck, IconLoader, IconX } from "@tabler/icons-react";
import { TRPCClientError } from "@trpc/client";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { PingDot } from "./ping-dot";

interface PingIndicatorProps {
  appId: string;
}

export const PingIndicator = ({ appId }: PingIndicatorProps) => {
  const t = useI18n();
  const loadingDot = <PingDot icon={IconLoader} color="blue" tooltip={`${t("common.action.loading")}…`} />;

  return (
    <ErrorBoundary fallbackRender={PingIndicatorErrorFallback}>
      <Suspense fallback={loadingDot}>
        {/* Key by appId so a changed app remounts with fresh ping state
            instead of showing the previous app's status. */}
        <PingIndicatorInner key={appId} appId={appId} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Apps without a server-pingable URL (e.g. path-only href without an explicit
// pingUrl) yield a CONFLICT. Render an indeterminate orange dot for that case
// so the card stays usable. Other tRPC errors (FORBIDDEN, NOT_FOUND, …) are
// re-thrown so the widget's outer error boundary handles them as before.
const PingIndicatorErrorFallback = ({ error }: FallbackProps) => {
  if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
    return <PingDot icon={IconLoader} color="orange" tooltip={error.message} />;
  }
  throw error;
};

const PingIndicatorInner = ({ appId }: PingIndicatorProps) => {
  const [ping] = clientApi.widget.app.ping.useSuspenseQuery(
    { id: appId },
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
