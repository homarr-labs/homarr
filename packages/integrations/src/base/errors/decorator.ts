import { isFunction } from "@homarr/common";

import type { Integration } from "../integration";
import type { IIntegrationErrorHandler } from "./handler";
import { IntegrationUnknownError } from "./integration-unknown-error";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

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
            if (!isFunction(original)) continue;

            processedProperties.add(propertyKey);

            const $this = this as Integration;
            const wrapped = function (...methodArgs: unknown[]) {
              try {
                const result = original.apply($this, methodArgs);
                return result;
              } catch (error: unknown) {
                for (const handler of errorHandlers) {
                  const handledError = handler.handleError(error, $this.publicIntegration);
                  if (!handledError) continue;

                  throw handledError;
                }

                // If the error was handled and should be thrown again, throw it
                // TODO: Later throw a common UnknownIntegrationError with cause
                throw new IntegrationUnknownError($this.publicIntegration, { cause: error });
              }
            };

            Object.defineProperty(currentProto, propertyKey, {
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
