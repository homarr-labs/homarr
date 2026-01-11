import { describe, expect, test, vi } from "vitest";

import { ResponseError } from "@homarr/common/server";

import { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import { IntegrationResponseError } from "../../base/errors/http/integration-response-error";
import { CoolifyApiErrorHandler } from "../coolify-error-handler";

// Mock environment modules to prevent client-side env check errors
vi.mock("@homarr/common/env", () => ({
  env: {
    SECRET_ENCRYPTION_KEY: "0".repeat(64),
  },
}));

vi.mock("@homarr/core/infrastructure/logs/env", () => ({
  logsEnv: {
    LEVEL: "info",
  },
}));

vi.mock("@homarr/core/infrastructure/db/env", () => ({
  dbEnv: {
    DRIVER: "better-sqlite3",
  },
}));

// Mock the redis client to prevent env access
vi.mock("@homarr/core/infrastructure/redis", () => ({
  createRedisClient: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    quit: vi.fn(),
  })),
}));

// Mock the logs module to prevent Redis transport issues
vi.mock("@homarr/core/infrastructure/logs", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

const integration = { id: "test-coolify", name: "Test Coolify", url: "https://coolify.example.com" };
const handler = new CoolifyApiErrorHandler();

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

      expect(result).toBeInstanceOf(IntegrationResponseError);
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

      expect(result).toBeInstanceOf(IntegrationResponseError);
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

      expect(result).toBeInstanceOf(IntegrationRequestError);
    });

    test("should return undefined for unrecognized errors", () => {
      const error = new Error("Some random error");
      const result = handler.handleError(error, integration);

      expect(result).toBeUndefined();
    });
  });
});
