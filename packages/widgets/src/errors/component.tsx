import { IconExclamationCircle, IconShield } from "@tabler/icons-react";
import { ORPCError } from "@orpc/client";

import type { WidgetDefinition } from "../definition";
import { ErrorBoundaryError } from "./base";
import type { BaseWidgetErrorProps } from "./base-component";
import { BaseWidgetError } from "./base-component";

interface WidgetErrorProps {
  definition?: WidgetDefinition;
  error: unknown;
  resetErrorBoundary: () => void;
}

export const WidgetError = ({ error, resetErrorBoundary, definition }: WidgetErrorProps) => {
  if (error instanceof ErrorBoundaryError) {
    return <BaseWidgetError {...error.getErrorBoundaryData()} onRetry={resetErrorBoundary} />;
  }

  const widgetRpcErrorData = definition ? handleWidgetRpcError(error, definition) : null;
  if (widgetRpcErrorData) {
    return <BaseWidgetError {...widgetRpcErrorData} onRetry={resetErrorBoundary} />;
  }

  const rpcErrorData = handleCommonRpcError(error);
  if (rpcErrorData) {
    return <BaseWidgetError {...rpcErrorData} onRetry={resetErrorBoundary} />;
  }

  return (
    <BaseWidgetError
      icon={IconExclamationCircle}
      message={(t) => t("common.error")}
      showLogsLink
      onRetry={resetErrorBoundary}
    />
  );
};

const handleWidgetRpcError = (
  error: unknown,
  currentDefinition: WidgetDefinition,
): Omit<BaseWidgetErrorProps, "onRetry"> | null => {
  if (!(error instanceof ORPCError)) return null;

  const errorData = error;

  if (!("errors" in currentDefinition) || currentDefinition.errors === undefined) return null;

  const errors: Exclude<WidgetDefinition["errors"], undefined> = currentDefinition.errors;
  const errorDefinition = errors[errorData.code];

  if (!errorDefinition) return null;

  return {
    ...errorDefinition,
    showLogsLink: !errorDefinition.hideLogsLink,
  };
};

const handleCommonRpcError = (error: unknown): Omit<BaseWidgetErrorProps, "onRetry"> | null => {
  if (!(error instanceof ORPCError)) return null;

  const errorData = error;

  if (errorData.code === "UNAUTHORIZED" || errorData.code === "FORBIDDEN") {
    return {
      icon: IconShield,
      message: (t) => t("integration.testConnection.error.certificate.alert.permission.title"),
      showLogsLink: false,
    };
  }

  return null;
};
