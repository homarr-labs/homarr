import { describe, expect, test, vi } from "vitest";

import * as homarrDefinitions from "@homarr/definitions";
import * as homarrIntegrations from "@homarr/integrations";

import { testConnectionAsync } from "../../integration/integration-test-connection";

vi.mock("@homarr/common/server", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/common/server")>();

  return {
    ...actual,
    decryptSecret: (value: string) => value.split(".")[0],
  };
});

describe("testConnectionAsync should run test connection of integration", () => {
  test("with input of only form secrets matching api key kind it should use form apiKey", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationCreator");
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
    expect(factorySpy).toHaveBeenCalledWith({
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "apiKey",
          value: "secret",
        }),
      ],
    });
  });

  test("with input of only null form secrets and the required db secrets matching api key kind it should use db apiKey", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationCreator");
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
          value: null,
        },
      ],
    };

    const dbSecrets = [
      {
        kind: "apiKey" as const,
        value: "dbSecret.encrypted" as const,
      },
    ];

    // Act
    await testConnectionAsync(integration, dbSecrets);

    // Assert
    expect(factorySpy).toHaveBeenCalledWith({
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "apiKey",
          value: "dbSecret",
        }),
      ],
    });
  });

  test("with input of form and db secrets matching api key kind it should use form apiKey", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationCreator");
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

    const dbSecrets = [
      {
        kind: "apiKey" as const,
        value: "dbSecret.encrypted" as const,
      },
    ];

    // Act
    await testConnectionAsync(integration, dbSecrets);

    // Assert
    expect(factorySpy).toHaveBeenCalledWith({
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "apiKey",
          value: "secret",
        }),
      ],
    });
  });

  test("with input of form apiKey and db secrets for username and password it should use form apiKey when both is allowed", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationCreator");
    const optionsSpy = vi.spyOn(homarrDefinitions, "getAllSecretKindOptions");
    factorySpy.mockReturnValue({
      testConnectionAsync: async () => await Promise.resolve(),
    } as homarrIntegrations.PiHoleIntegration);
    optionsSpy.mockReturnValue([["username", "password"], ["apiKey"]]);

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

    const dbSecrets = [
      {
        kind: "username" as const,
        value: "dbUsername.encrypted" as const,
      },
      {
        kind: "password" as const,
        value: "dbPassword.encrypted" as const,
      },
    ];

    // Act
    await testConnectionAsync(integration, dbSecrets);

    // Assert
    expect(factorySpy).toHaveBeenCalledWith({
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "apiKey",
          value: "secret",
        }),
      ],
    });
  });

  test("with input of null form apiKey and db secrets for username and password it should use db username and password when both is allowed", async () => {
    // Arrange
    const factorySpy = vi.spyOn(homarrIntegrations, "integrationCreator");
    const optionsSpy = vi.spyOn(homarrDefinitions, "getAllSecretKindOptions");
    factorySpy.mockReturnValue({
      testConnectionAsync: async () => await Promise.resolve(),
    } as homarrIntegrations.PiHoleIntegration);
    optionsSpy.mockReturnValue([["username", "password"], ["apiKey"]]);

    const integration = {
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole" as const,
      secrets: [
        {
          kind: "apiKey" as const,
          value: null,
        },
      ],
    };

    const dbSecrets = [
      {
        kind: "username" as const,
        value: "dbUsername.encrypted" as const,
      },
      {
        kind: "password" as const,
        value: "dbPassword.encrypted" as const,
      },
    ];

    // Act
    await testConnectionAsync(integration, dbSecrets);

    // Assert
    expect(factorySpy).toHaveBeenCalledWith({
      id: "new",
      name: "Pi Hole",
      url: "http://pi.hole",
      kind: "piHole",
      decryptedSecrets: [
        expect.objectContaining({
          kind: "username",
          value: "dbUsername",
        }),
        expect.objectContaining({
          kind: "password",
          value: "dbPassword",
        }),
      ],
    });
  });
});
