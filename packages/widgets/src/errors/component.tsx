import { useMemo } from "react";
import { IconExclamationCircle } from "@tabler/icons-react";
import { TRPCClientError } from "@trpc/client";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { WidgetKind } from "@homarr/definitions";

import type { WidgetDefinition } from "..";
import { widgetImports } from "..";
import { ErrorBoundaryError } from "./base";
import { BaseWidgetError } from "./base-component";

interface WidgetErrorProps {
  kind: WidgetKind;
  error: unknown;
  resetErrorBoundary: () => void;
}

export const WidgetError = ({ error, resetErrorBoundary, kind }: WidgetErrorProps) => {
  const currentDefinition = useMemo(() => widgetImports[kind].definition, [kind]);

  if (error instanceof ErrorBoundaryError) {
    return <BaseWidgetError {...error.getErrorBoundaryData()} onRetry={resetErrorBoundary} />;
  }

  const commonFallbackError = (
    <BaseWidgetError
      icon={IconExclamationCircle}
      message={(error as { toString: () => string }).toString()}
      onRetry={resetErrorBoundary}
    />
  );

  if (error instanceof TRPCClientError && "code" in error.data) {
    const errorData = error.data as DefaultErrorData;

    if (!("errors" in currentDefinition)) return commonFallbackError;

    const errors: Exclude<WidgetDefinition["errors"], undefined> = currentDefinition.errors;
    const errorDefinition = errors[errorData.code];

    if (!errorDefinition) return commonFallbackError;

    return (
      <BaseWidgetError {...errorDefinition} onRetry={resetErrorBoundary} showLogsLink={!errorDefinition.hideLogsLink} />
    );
  }

  return commonFallbackError;
};
