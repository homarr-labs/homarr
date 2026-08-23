import { isFunction } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { Integration } from "../integration";
import type { IIntegrationErrorHandler } from "./handler";
import { integrationFetchHttpErrorHandler } from "./http";
import { IntegrationError } from "./integration-error";
import { IntegrationUnknownError } from "./integration-unknown-error";
import { IntegrationRequestError } from "./http/integration-request-error";
import { IntegrationResponseError } from "./http/integration-response-error";
import { integrationJsonParseErrorHandler, integrationZodParseErrorHandler } from "./parse";

const logger = createLogger({ module: "handleIntegrationErrors" });
const loggedIntegrationErrors = new WeakSet<IntegrationError>();

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

const defaultErrorHandlers: IIntegrationErrorHandler[] = [
  integrationZodParseErrorHandler,
  integrationJsonParseErrorHandler,
  integrationFetchHttpErrorHandler,
];

interface IntegrationOperationMetadata {
  operation: string;
  integrationId: string;
  integrationKind: string;
  integrationName: string;
}

const safeErrorNameRegex = /^(?:Error|[A-Za-z][A-Za-z0-9]*(?:Error|Err))$/;

const createSafeErrorCause = (error: unknown, depth = 0): Error => {
  let options: ErrorOptions | undefined;
  if (depth < 5 && error instanceof Error && error.cause !== undefined) {
    options = { cause: createSafeErrorCause(error.cause, depth + 1) };
  }

  const safeError = new Error("Integration operation failed", options);
  if (error instanceof Error && safeErrorNameRegex.test(error.name)) {
    safeError.name = error.name;
  }
  return safeError;
};

const logFailure = (
  error: IntegrationError,
  failureType: "normalized" | "unknown",
  metadata: IntegrationOperationMetadata,
  durationMs: number,
) => {
  if (loggedIntegrationErrors.has(error)) {
    return;
  }

  loggedIntegrationErrors.add(error);
  const errorMetadata: Record<string, unknown> = { errorType: error.name };
  if (error instanceof IntegrationRequestError) {
    errorMetadata.requestType = error.cause.type;
    errorMetadata.requestReason = error.cause.reason;
    errorMetadata.requestCode = error.cause.code;
  }
  if (error instanceof IntegrationResponseError) {
    errorMetadata.statusCode = error.cause.statusCode;
  }
  logger.warn(
    new ErrorWithMetadata(
      "Integration operation failed",
      {
        ...metadata,
        durationMs,
        failureType,
        ...errorMetadata,
      },
      { cause: createSafeErrorCause(error) },
    ),
  );
};

export const HandleIntegrationErrors = (errorHandlers: IIntegrationErrorHandler[]) => {
  const combinedErrorHandlers = [...defaultErrorHandlers, ...errorHandlers];
  return <T extends AbstractConstructor<Integration>>(IntegrationBaseClass: T): T => {
    abstract class ErrorHandledIntegration extends IntegrationBaseClass {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        super(...args);
        const processedProperties = new Set<string>();

        let currentProto: unknown = Object.getPrototypeOf(this);

        while (currentProto && currentProto !== Object.prototype) {
          for (const propertyKey of Object.getOwnPropertyNames(currentProto)) {
            if (propertyKey === "constructor" || processedProperties.has(propertyKey)) continue;

            const descriptor = Object.getOwnPropertyDescriptor(currentProto, propertyKey);

            if (!descriptor) continue;
            const original: unknown = descriptor.value;
            if (!isFunction(original)) continue;

            processedProperties.add(propertyKey);

            const wrapped = (...methodArgs: unknown[]) => {
              const startedAt = Date.now();
              const operationMetadata: IntegrationOperationMetadata = {
                operation: propertyKey,
                integrationId: this.publicIntegration.id,
                integrationKind: this.integration.kind ?? "unknown",
                integrationName: this.publicIntegration.name,
              };

              logger.debug("Integration operation started", operationMetadata);

              const logCompletion = () => {
                logger.debug("Integration operation completed", {
                  ...operationMetadata,
                  durationMs: Date.now() - startedAt,
                });
              };

              const handleError = (error: unknown): never => {
                if (error instanceof IntegrationError) {
                  const failureType = error instanceof IntegrationUnknownError ? "unknown" : "normalized";
                  logFailure(error, failureType, operationMetadata, Date.now() - startedAt);
                  throw error;
                }

                for (const handler of combinedErrorHandlers) {
                  const handledError = handler.handleError(error, this.publicIntegration);
                  if (!handledError) continue;

                  logFailure(handledError, "normalized", operationMetadata, Date.now() - startedAt);
                  throw handledError;
                }

                const unknownError = new IntegrationUnknownError(this.publicIntegration, { cause: error });
                logFailure(unknownError, "unknown", operationMetadata, Date.now() - startedAt);
                throw unknownError;
              };

              try {
                const result = original.apply(this, methodArgs);

                if (result instanceof Promise) {
                  return result.then(
                    (value: unknown) => {
                      logCompletion();
                      return value;
                    },
                    (error: unknown) => handleError(error),
                  );
                }

                logCompletion();
                return result;
              } catch (error: unknown) {
                handleError(error);
              }
            };

            Object.defineProperty(this, propertyKey, {
              ...descriptor,
              value: wrapped,
            });
          }

          currentProto = Object.getPrototypeOf(currentProto);
        }
      }
    }

    return ErrorHandledIntegration;
  };
};
