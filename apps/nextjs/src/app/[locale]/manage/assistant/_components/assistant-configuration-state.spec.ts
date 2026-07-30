import { describe, expect, it } from "vitest";

import { getAssistantConnectionState } from "./assistant-configuration-state";

describe("getAssistantConnectionState", () => {
  it("marks a saved required-key provider as ready", () => {
    expect(
      getAssistantConnectionState({
        connectionConfigured: true,
        destinationChanged: false,
        providerRequiresApiKey: true,
        apiKeyConfigured: true,
      }),
    ).toEqual({
      hasStoredApiKey: true,
      connectionPending: false,
      connectionReady: true,
    });
  });

  it("requires the endpoint to be saved before exposing model controls", () => {
    expect(
      getAssistantConnectionState({
        connectionConfigured: true,
        destinationChanged: true,
        providerRequiresApiKey: true,
        apiKeyConfigured: true,
      }),
    ).toEqual({
      hasStoredApiKey: false,
      connectionPending: true,
      connectionReady: false,
    });
  });

  it("does not call a required-key connection ready after its key is removed", () => {
    expect(
      getAssistantConnectionState({
        connectionConfigured: true,
        destinationChanged: false,
        providerRequiresApiKey: true,
        apiKeyConfigured: false,
      }),
    ).toEqual({
      hasStoredApiKey: false,
      connectionPending: true,
      connectionReady: false,
    });
  });

  it("allows a saved local endpoint without an API key", () => {
    expect(
      getAssistantConnectionState({
        connectionConfigured: true,
        destinationChanged: false,
        providerRequiresApiKey: false,
        apiKeyConfigured: false,
      }),
    ).toEqual({
      hasStoredApiKey: false,
      connectionPending: false,
      connectionReady: true,
    });
  });
});
