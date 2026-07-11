import type { Agent } from "node:https";
import { DAVClient } from "tsdav";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { NextcloudIntegration } from "../nextcloud.integration";

vi.mock("tsdav", () => ({ DAVClient: vi.fn() }));

interface NextcloudCalendarClientFactory {
  createCalendarClientAsync(agent: Agent): Promise<unknown>;
}

describe("NextcloudIntegration", () => {
  beforeEach(() => {
    vi.mocked(DAVClient).mockClear();
  });

  test("uses a calendar server URL that preserves the integration subpath", async () => {
    const integration = new NextcloudIntegration({
      id: "integration-id",
      name: "Nextcloud",
      url: "https://example.com/nextcloud",
      externalUrl: null,
      decryptedSecrets: [
        { kind: "username", value: "admin" },
        { kind: "password", value: "password" },
      ],
    });

    await (integration as unknown as NextcloudCalendarClientFactory).createCalendarClientAsync({} as Agent);

    expect(DAVClient).toHaveBeenCalledWith(
      expect.objectContaining({
        serverUrl: "https://example.com/nextcloud/remote.php/dav/",
      }),
    );
  });
});
