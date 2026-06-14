import proxmoxApi from "proxmox-api";
import { Response } from "undici";
import { describe, expect, test } from "vitest";

import { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import { IntegrationResponseError } from "../../base/errors/http/integration-response-error";
import { ProxmoxApiErrorHandler } from "../proxmox-error-handler";

describe("ProxmoxApiErrorHandler handleError should handle the provided error accordingly", () => {
  test.each([400, 401, 500])("should handle %s error", async (statusCode) => {
    const mockedFetch = async () => Promise.resolve(createFakeResponse(statusCode));

    const result = await runWithAsync(mockedFetch);

    expect(result).toBeInstanceOf(IntegrationResponseError);
    const error = result as unknown as IntegrationResponseError;
    expect(error.cause.statusCode).toBe(statusCode);
  });
  test("should handle other non successful status codes", async () => {
    const mockedFetch = async () => Promise.resolve(createFakeResponse(404));

    const result = await runWithAsync(mockedFetch);

    expect(result).toBeInstanceOf(IntegrationResponseError);
    const error = result as unknown as IntegrationResponseError;
    expect(error.cause.statusCode).toBe(404);
  });
  test("should handle request error", async () => {
    const mockedFetch = () => {
      const errorWithCode = new Error("Inner error") as Error & { code: string };
      errorWithCode.code = "ECONNREFUSED";
      throw new TypeError("Outer error", { cause: errorWithCode });
    };

    const result = await runWithAsync(mockedFetch);

    expect(result).toBeInstanceOf(IntegrationRequestError);
    const error = result as unknown as IntegrationRequestError;
    expect(error.cause.cause).toBeInstanceOf(TypeError);
    expect(error.cause.cause?.message).toBe("Outer error");
    expect(error.cause.cause?.cause).toBeInstanceOf(Error);
    const cause = error.cause.cause?.cause as Error & { code: string };
    expect(cause.message).toBe("Inner error");
    expect(cause.code).toBe("ECONNREFUSED");
  });
});

const createFakeResponse = (statusCode: number) => {
  return new Response(JSON.stringify({ data: {} }), {
    status: statusCode,
    headers: { "content-type": "application/json;charset=UTF-8" },
  });
};

const runWithAsync = async (mockedFetch: (...args: any[]) => any) => {
  const integration = { id: "test", name: "test", url: "http://proxmox.example.com" };
  const client = createProxmoxClient(mockedFetch);
  const handler = new ProxmoxApiErrorHandler();

  return await client.nodes.$get().catch((error) => handler.handleError(error, integration));
};

const createProxmoxClient = (fetch: (...args: any[]) => any) => {
  return proxmoxApi({
    host: "proxmox.example.com",
    tokenID: "username@realm!tokenId",
    tokenSecret: crypto.randomUUID(),
    fetch: fetch as any,
  });
};
