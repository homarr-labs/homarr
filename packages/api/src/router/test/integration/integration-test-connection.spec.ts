import { describe, expect, test, vi } from "vitest";

import * as homarrDefinitions from "@homarr/definitions";
import * as homarrIntegrations from "@homarr/integrations";

import { testConnectionAsync } from "../../integration/integration-test-connection";

vi.mock("@homarr/common", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/common")>();

  return {
    ...actual,
    // Add a random character at the beginning of the string to check if it's removed
    decryptSecret: (value: string) => value.substring(1),
  };
});

describe("testConnectionAsync should run test connection of integration", () => {
  test("with input of only form secrets matching api key kind", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationFactory");
    const optionsSpy = vi.spyOn(homarrDefinitions, "getAllSecretKindOptions");
    factorySpy.mockReturnValue({
      testConnectionAsync: async () => await Promise.resolve(),
    } as homarrIntegrations.PiHoleIntegration);
    optionsSpy.mockReturnValue([["apiKey"]]);

    const integration = {
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole" as const,
      secrets: [
        {
          kind: "apiKey" as const,
          value: "secret",
        },
      ],
    };

    // Act
    await testConnectionAsync(integration);

    // Assert
    expect(factorySpy).toHaveBeenCalledWith("piHole", {
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "apiKey",
          value: "secret",
        }),
      ],
    });
  });
});
