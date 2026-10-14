import { getIntegrationRuntimeResources } from "../../runtime/context";
import { normalizeSanitizedIntegrationTransportError } from "../../runtime/transport-errors";

import type { Integration } from "../integration";
import type { IIntegrationErrorHandler } from "./handler";
import { IntegrationError } from "./integration-error";
import { IntegrationUnknownError } from "./integration-unknown-error";
import { IntegrationRequestError } from "./http/integration-request-error";
import { IntegrationResponseError } from "./http/integration-response-error";

const loggedIntegrationErrors = new WeakSet<IntegrationError>();

// ponytail: TypeScript requires `any[]` for mixin constructors (TS2545). The
// decorator returns the same constructor type T, so callers retain exact args.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

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
  getIntegrationRuntimeResources()?.log?.write("warn", "Integration operation failed", {
    ...metadata,
    durationMs,
    failureType,
    errorType: error.name,
    requestType: error instanceof IntegrationRequestError ? error.cause.type : undefined,
    requestReason: error instanceof IntegrationRequestError ? error.cause.reason : undefined,
    requestCode: error instanceof IntegrationRequestError ? error.cause.code : undefined,
    statusCode: error instanceof IntegrationResponseError ? error.cause.statusCode : undefined,
  });
};

export const HandleIntegrationErrors = (errorHandlers: IIntegrationErrorHandler[]) => {
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
            if (typeof original !== "function") continue;

            processedProperties.add(propertyKey);

            const wrapped = (...methodArgs: unknown[]) => {
              const startedAt = Date.now();
              const operationMetadata: IntegrationOperationMetadata = {
                operation: propertyKey,
                integrationId: this.publicIntegration.id,
                integrationKind: this.integration.kind ?? "unknown",
                integrationName: this.publicIntegration.name,
              };

              const resources = getIntegrationRuntimeResources();
              resources?.log?.write("debug", "Integration operation started", { ...operationMetadata });

              const logCompletion = () => {
                resources?.log?.write("debug", "Integration operation completed", {
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

                const safeTransportError = normalizeSanitizedIntegrationTransportError(error, this.publicIntegration);
                if (safeTransportError) {
                  logFailure(safeTransportError, "normalized", operationMetadata, Date.now() - startedAt);
                  throw safeTransportError;
                }

                for (const handler of [...(resources?.errorHandlers ?? []), ...errorHandlers]) {
                  const handledError = handler.handleError(error, this.publicIntegration);
                  if (!handledError) continue;

                  logFailure(handledError, "normalized", operationMetadata, Date.now() - startedAt);
                  throw handledError;
                }

                const unknownError = new IntegrationUnknownError(this.publicIntegration, {
                  cause: createSafeErrorCause(error),
                });
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
