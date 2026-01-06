import { beforeAll, describe, expect, test, vi } from "vitest";

import type { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import type { IntegrationResponseError } from "../../base/errors/http/integration-response-error";
import type { CoolifyApiErrorHandler as CoolifyApiErrorHandlerType } from "../coolify-error-handler";

vi.stubEnv("SECRET_ENCRYPTION_KEY", "0".repeat(64));

const integration = { id: "test-coolify", name: "Test Coolify", url: "https://coolify.example.com" };

let ResponseError: typeof import("@homarr/common/server").ResponseError;
let IntegrationRequestErrorClass: typeof import("../../base/errors/http/integration-request-error").IntegrationRequestError;
let IntegrationResponseErrorClass: typeof import("../../base/errors/http/integration-response-error").IntegrationResponseError;
let handler: CoolifyApiErrorHandlerType;

beforeAll(async () => {
  const commonServer = await import("@homarr/common/server");
  ResponseError = commonServer.ResponseError;

  const requestErrorModule = await import("../../base/errors/http/integration-request-error");
  IntegrationRequestErrorClass = requestErrorModule.IntegrationRequestError;

  const responseErrorModule = await import("../../base/errors/http/integration-response-error");
  IntegrationResponseErrorClass = responseErrorModule.IntegrationResponseError;

  const handlerModule = await import("../coolify-error-handler");
  handler = new handlerModule.CoolifyApiErrorHandler();
});

describe("CoolifyApiErrorHandler", () => {
  describe("handleError should handle the provided error accordingly", () => {
    test("should return undefined for non-Error objects", () => {
      const result = handler.handleError("not an error", integration);
      expect(result).toBeUndefined();
    });

    test("should return undefined for non-Error null", () => {
      const result = handler.handleError(null, integration);
      expect(result).toBeUndefined();
    });

    test("should handle ResponseError directly", () => {
      const responseError = new ResponseError({ status: 500 });
      const result = handler.handleError(responseError, integration);

      expect(result).toBeInstanceOf(IntegrationResponseErrorClass);
      expect((result as IntegrationResponseError).cause).toBe(responseError);
    });

    test.each([
      { message: "401 Unauthorized", expectedStatus: 401 },
      { message: "Request failed with Unauthorized error", expectedStatus: 401 },
      { message: "403 Forbidden", expectedStatus: 403 },
      { message: "Access Forbidden for this resource", expectedStatus: 403 },
      { message: "404 Not Found", expectedStatus: 404 },
      { message: "Resource Not Found", expectedStatus: 404 },
      { message: "500 Internal Server Error", expectedStatus: 500 },
      { message: "Internal Server Error occurred", expectedStatus: 500 },
    ])("should handle error message containing '$message' as status $expectedStatus", ({ message, expectedStatus }) => {
      const error = new Error(message);
      const result = handler.handleError(error, integration);

      expect(result).toBeInstanceOf(IntegrationResponseErrorClass);
      const integrationError = result as IntegrationResponseError;
      expect(integrationError.cause).toBeInstanceOf(ResponseError);
      expect(integrationError.cause.statusCode).toBe(expectedStatus);
    });

    test("should handle fetch TypeError errors", () => {
      const innerError = new Error("Connection refused") as Error & { code: string };
      innerError.code = "ECONNREFUSED";
      const typeError = new TypeError("fetch failed", { cause: innerError });
      const error = new Error("Fetch error", { cause: typeError });

      const result = handler.handleError(error, integration);

      expect(result).toBeInstanceOf(IntegrationRequestErrorClass);
    });

    test("should return undefined for unrecognized errors", () => {
      const error = new Error("Some random error");
      const result = handler.handleError(error, integration);

      expect(result).toBeUndefined();
    });
  });
});
