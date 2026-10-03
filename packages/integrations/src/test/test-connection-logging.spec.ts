import { describe, expect, test, vi } from "vitest";

import { TestConnectionError } from "../base/test-connection/test-connection-error";
import { TestConnectionService } from "../base/test-connection/test-connection-service";

const log = vi.hoisted(() => vi.fn());
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ info: log, debug: log, warn: log, error: log }),
}));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: async () => [],
  getTrustedCertificateHostnamesAsync: async () => [],
}));

describe("connection-test logs", () => {
  test("omit URL credentials, query credentials and upstream error messages", async () => {
    const secret = "must-not-be-logged";
    const service = new TestConnectionService(
      new URL(`http://user:${secret}@localhost/private/${secret}?token=${secret}`),
    );
    await service.handleAsync(async () => TestConnectionError.UnknownResult(new Error(secret)));
    expect(log).toHaveBeenCalledWith("Testing connection failed", { origin: "http://localhost", errorType: "unknown" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  });
});
