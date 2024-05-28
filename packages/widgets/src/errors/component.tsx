import { useMemo } from "react";
import { IconExclamationCircle } from "@tabler/icons-react";
import { TRPCClientError } from "@trpc/client";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { WidgetKind } from "@homarr/definitions";

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

  if (error instanceof TRPCClientError && "code" in error.data) {
    const errorData = error.data as DefaultErrorData;

    if (!("errors" in currentDefinition && errorData.code in currentDefinition.errors)) return null;

    const errorDefinition = currentDefinition.errors[errorData.code as keyof typeof currentDefinition.errors];

    return <BaseWidgetError {...errorDefinition} onRetry={resetErrorBoundary} showLogsLink />;
  }

  return (
    <BaseWidgetError
      icon={IconExclamationCircle}
      message={(error as { toString: () => string }).toString()}
      onRetry={resetErrorBoundary}
    />
  );
};
