import { describe, expect, test } from "vitest";

import { httpIntegrationKinds, integrationDefs } from "@homarr/definitions/integration";
import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";

describe("reusable HTTP integration authentication", () => {
  test.each(httpIntegrationKinds)("%s resolves the authentication advertised to Custom Widgets", async (kind) => {
    const definition = integrationDefs[kind];
    const secretKinds = definition.secretKinds[0];
    const authentication = await getIntegrationHttpAuthenticationAsync({
      id: `test-${kind}`,
      kind,
      name: definition.name,
      url: "http://integration.test",
      externalUrl: null,
      decryptedSecrets: secretKinds.map((secretKind) => ({ kind: secretKind, value: `test-${secretKind}` })),
    });

    expect(authentication).toEqual(
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    );
    for (const [name, value] of Object.entries(authentication.headers)) {
      expect(name).not.toHaveLength(0);
      expect(value).not.toHaveLength(0);
    }
  });
});
