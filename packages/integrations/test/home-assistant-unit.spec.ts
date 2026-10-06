// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { HomeAssistantIntegration } from "../src";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const integration = new HomeAssistantIntegration({
  id: "home-assistant",
  name: "Home Assistant",
  url: "http://home-assistant.local:8123",
  externalUrl: null,
  decryptedSecrets: [{ kind: "apiKey", value: "secret" }],
});

describe("HomeAssistantIntegration actions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true } as never);
  });

  test.each([
    ["toggle", () => integration.triggerToggleAsync("light.desk"), "/api/services/homeassistant/toggle", "light.desk"],
    [
      "automation",
      () => integration.triggerAutomationAsync("automation.turn_on_lights"),
      "/api/services/automation/trigger",
      "automation.turn_on_lights",
    ],
  ])("sends the %s service call as JSON", async (_action, trigger, path, entityId) => {
    await expect(trigger()).resolves.toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(new URL(`http://home-assistant.local:8123${path}`), {
      headers: {
        Authorization: "Bearer secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entity_id: entityId }),
      method: "POST",
    });
  });
});
