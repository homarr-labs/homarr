import { describe, expect, test } from "vitest";

import { intersectFederationPermissions, markFederationUnavailable } from "@homarr/auth/server";
import { encryptSecret } from "@homarr/common/server";

const full = { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true };
const none = { hasUseAccess: false, hasInteractAccess: false, hasFullAccess: false };
const query = { hasUseAccess: true, hasInteractAccess: false, hasFullAccess: false };
function origin(access: "query" | "interact" | "full", expiresAt = Date.now() + 60_000) {
  return {
    remoteIntegrationId: "remote",
    connection: {
      id: "permission-ceiling-test",
      enabled: true,
      encryptedConfiguration: encryptSecret(
        JSON.stringify({ verifiedAuthorization: { access, integrationIds: ["remote"], expiresAt } }),
      ),
    },
  };
}

describe("federated permissions only narrow native permissions", () => {
  test("query-only source approval caps a primary administrator and full source approval grants no extra rights", () => {
    expect(intersectFederationPermissions(full, origin("query"))).toEqual(query);
    expect(intersectFederationPermissions(none, origin("full"))).toEqual(none);
  });
  test("expired, disabled, missing, or unknown integration authority exposes no action permission", () => {
    expect(intersectFederationPermissions(full, origin("full", Date.now() - 1))).toEqual(none);
    const disabled = origin("full");
    disabled.connection.enabled = false;
    expect(intersectFederationPermissions(full, disabled)).toEqual(none);
    const unknown = origin("full");
    unknown.remoteIntegrationId = "not-approved";
    expect(intersectFederationPermissions(full, unknown)).toEqual(none);
    const missing = origin("full");
    missing.connection.encryptedConfiguration = encryptSecret("{}");
    expect(intersectFederationPermissions(full, missing)).toEqual(none);
  });
  test("a failed source disables action controls while read-only recovery never raises the stored ceiling", () => {
    const source = origin("query");
    markFederationUnavailable(source.connection.id, true);
    expect(intersectFederationPermissions(full, source)).toEqual(none);
    expect(intersectFederationPermissions(full, source, true)).toEqual(query);
    markFederationUnavailable(source.connection.id, false);
    expect(intersectFederationPermissions(full, source)).toEqual(query);
  });
});
