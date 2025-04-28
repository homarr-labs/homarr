import { Response } from "undici";
import { describe, expect, test } from "vitest";

import { IntegrationTestConnectionError } from "../src";
import { Integration } from "../src/base/integration";

type HandleResponseProps = Parameters<Integration["handleTestConnectionResponseAsync"]>[0];

class BaseIntegrationMock extends Integration {
  public async fakeTestConnectionAsync(props: HandleResponseProps): Promise<void> {
    await super.handleTestConnectionResponseAsync(props);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async testingAsync(): Promise<void> {}
}

describe("Base integration", () => {
  describe("handleTestConnectionResponseAsync", () => {
    test("With no cause error should throw IntegrationTestConnectionError with key commonError", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const errorMessage = "The error message";
      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.reject(new Error(errorMessage));
        },
      };

      // Act
      const actPromise = integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actPromise).rejects.toHaveProperty("key", "commonError");
      await expect(actPromise).rejects.toHaveProperty("detailMessage", errorMessage);
    });

    test("With cause ENOTFOUND should throw IntegrationTestConnectionError with key domainNotFound", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.reject(new Error("Error", { cause: { code: "ENOTFOUND" } }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "domainNotFound");
    });

    test("With cause ENOTFOUND should throw IntegrationTestConnectionError with key connectionRefused", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.reject(new Error("Error", { cause: { code: "ECONNREFUSED" } }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "connectionRefused");
    });

    test("With cause ENOTFOUND should throw IntegrationTestConnectionError with key connectionAborted", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.reject(new Error("Error", { cause: { code: "ECONNABORTED" } }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "connectionAborted");
    });

    test("With not handled cause error should throw IntegrationTestConnectionError with key commonError", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const errorMessage = "The error message";
      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.reject(new Error(errorMessage));
        },
      };

      // Act
      const actPromise = integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actPromise).rejects.toHaveProperty("key", "commonError");
      await expect(actPromise).rejects.toHaveProperty("detailMessage", errorMessage);
    });

    test("With response status code 400 should throw IntegrationTestConnectionError with key badRequest", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 400 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "badRequest");
    });

    test("With response status code 401 should throw IntegrationTestConnectionError with key unauthorized", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 401 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "unauthorized");
    });

    test("With response status code 403 should throw IntegrationTestConnectionError with key forbidden", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 403 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "forbidden");
    });

    test("With response status code 404 should throw IntegrationTestConnectionError with key notFound", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 404 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "notFound");
    });

    test("With response status code 500 should throw IntegrationTestConnectionError with key internalServerError", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 500 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "internalServerError");
    });

    test("With response status code 503 should throw IntegrationTestConnectionError with key serviceUnavailable", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 503 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "serviceUnavailable");
    });

    test("With response status code 418 (or any other unhandled code) should throw IntegrationTestConnectionError with key commonError", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 418 }));
        },
      };

      // Act
      const actAsync = async () => await integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actAsync()).rejects.toHaveProperty("key", "commonError");
    });

    test("Errors from handleResponseAsync should be thrown", async () => {
      // Arrange
      const integration = new BaseIntegrationMock({ id: "id", name: "name", url: "url", decryptedSecrets: [] });

      const errorMessage = "The error message";
      const props: HandleResponseProps = {
        async queryFunctionAsync() {
          return await Promise.resolve(new Response(null, { status: 200 }));
        },
        async handleResponseAsync() {
          return await Promise.reject(new IntegrationTestConnectionError("commonError", errorMessage));
        },
      };

      // Act
      const actPromise = integration.fakeTestConnectionAsync(props);

      // Assert
      await expect(actPromise).rejects.toHaveProperty("key", "commonError");
      await expect(actPromise).rejects.toHaveProperty("detailMessage", errorMessage);
    });
  });
});
