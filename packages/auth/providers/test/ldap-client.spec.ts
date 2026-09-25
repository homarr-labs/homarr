import { Client } from "ldapts";
import { describe, expect, test, vi } from "vitest";

import { LdapClient } from "../credentials/ldap-client";

vi.mock("../../env", () => ({ env: { AUTH_LDAP_URI: "ldap://127.0.0.1:389" } }));

describe("LDAP search distinguished names", () => {
  test.each([
    "cn=Comma\\2C User,dc=example,dc=com",
    "cn=100% User,dc=example,dc=com",
    "cn=Unicode\\c4\\87,dc=example,dc=com",
    "cn=Громов Иван,dc=example,dc=com",
  ])("preserves %s for the subsequent bind", async (dn) => {
    vi.spyOn(Client.prototype, "search").mockResolvedValueOnce({
      searchEntries: [{ dn, mail: [Buffer.from("user@example.com")] }],
      searchReferences: [],
    });
    const entries = await new LdapClient().searchAsync({ base: "dc=example,dc=com", options: {} });

    expect(entries).toEqual([{ dn, mail: "user@example.com" }]);
  });
});
