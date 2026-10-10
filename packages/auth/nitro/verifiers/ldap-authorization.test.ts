import assert from "node:assert/strict";
import { test } from "node:test";

import { FilterParser } from "ldapts";
import type { Entry } from "ldapts";

import type { LdapConfiguration, NewLdapIdentity } from "./contracts";
import { authorizeWithLdapCredentialsAsync, verifyLdapCredentialsAsync } from "./ldap-authorization";
import { LdapClient } from "./ldap-client";
import type { LdapTransport } from "./ldap-client";
import type { LdapVerifierResources } from "./ldap-authorization";

const configuration: LdapConfiguration = {
  bindDistinguishedName: "cn=fixture-service,dc=example,dc=invalid",
  bindPassword: "disposable-service-password",
  base: "dc=example,dc=invalid",
  searchScope: "sub",
  usernameAttribute: "uid",
  userMailAttribute: "mail",
  usernameFilterExtraArg: "(employeeType=human)",
  groupClass: "group",
  groupMemberAttribute: "member",
  groupMemberUserAttribute: "distinguishedName",
  groupFilterExtraArg: "(sAMAccountType=1234)",
};

const logger = { info() {}, warn() {}, error() {} };

test("synthetic LDAP protocol retains escaped filters, exact DN, first values and provider-scoped creation", async () => {
  const username = "Alice*)(uid=*)";
  const dn = "cn=Comma\\2C Unicode\\c4\\87 (test),dc=example,dc=invalid";
  const calls: {
    client: number;
    method: string;
    dn?: string;
    attributes?: string[];
    filter?: string;
    scope?: string;
  }[] = [];
  const entries: Entry[] = [
    {
      dn,
      uid: username,
      employeeType: "human",
      distinguishedName: dn,
      mail: [Buffer.from("alice@example.invalid"), Buffer.from("ignored@example.invalid")],
    },
    {
      dn: "cn=staff,dc=example,dc=invalid",
      objectClass: "group",
      member: dn,
      sAMAccountType: "1234",
      cn: ["staff", "ignored"],
    },
    {
      dn: "cn=other,dc=example,dc=invalid",
      objectClass: "group",
      member: "cn=someone-else",
      sAMAccountType: "1234",
      cn: "unrelated",
    },
  ];
  let clientCount = 0;
  const identities = [{ id: "same-email-local", email: "alice@example.invalid", provider: "credentials" }];
  const inserted: NewLdapIdentity[] = [];
  const resources = {
    configuration,
    logger,
    createId: () => "new-directory-identity",
    now: () => Date.parse("2026-10-10T12:00:00Z"),
    createClient() {
      const client = clientCount++;
      const transport: LdapTransport = {
        async bind(distinguishedName, password) {
          assert.equal(typeof distinguishedName, "string");
          calls.push({ client, method: "bind", dn: String(distinguishedName) });
          assert.equal(password, client % 2 === 0 ? configuration.bindPassword : "disposable-user-password");
        },
        async search(base, options) {
          assert.equal(base, configuration.base);
          assert.equal(typeof options?.filter, "string");
          assert.ok(options && typeof options.filter === "string");
          calls.push({
            client,
            method: "search",
            filter: options.filter,
            attributes: options.attributes,
            scope: options.scope,
          });
          const filter = FilterParser.parseString(options.filter);
          const searchEntries = entries.filter((entry) =>
            filter.matches(
              Object.fromEntries(
                Object.entries(entry).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
              ),
            ),
          );
          return { searchEntries, searchReferences: [] };
        },
        async unbind() {
          calls.push({ client, method: "unbind" });
        },
      };
      return new LdapClient(transport);
    },
    repository: {
      async findUserByEmail(selector: { email: string; provider: "ldap" }) {
        return (
          identities.find((identity) => identity.email === selector.email && identity.provider === selector.provider) ??
          null
        );
      },
      async insertUser(user: NewLdapIdentity) {
        inserted.push(user);
        identities.push(user);
      },
    },
  };
  const result = await authorizeWithLdapCredentialsAsync(resources, {
    name: username,
    password: "disposable-user-password",
  });
  assert.deepEqual(result, { id: "new-directory-identity", name: username, groups: ["staff"] });
  assert.deepEqual(inserted, [
    {
      id: "new-directory-identity",
      name: username,
      email: "alice@example.invalid",
      emailVerified: new Date("2026-10-10T12:00:00Z"),
      image: null,
      provider: "ldap",
    },
  ]);
  assert.deepEqual(
    calls.map((call) => [call.client, call.method]),
    [
      [0, "bind"],
      [0, "search"],
      [1, "bind"],
      [1, "unbind"],
      [0, "search"],
      [0, "unbind"],
    ],
  );
  assert.equal(calls[2]?.dn, dn);
  assert.deepEqual(calls[1]?.attributes, ["uid", "mail", "distinguishedName"]);
  assert.equal(calls[1]?.scope, "sub");
  const userFilter = calls[1]?.filter;
  assert.ok(userFilter);
  assert.equal(FilterParser.parseString(userFilter).matches({ uid: "someone-else", employeeType: "human" }), false);
  const groupFilter = calls[4]?.filter;
  assert.ok(groupFilter);
  assert.equal(
    FilterParser.parseString(groupFilter).matches({ objectClass: "group", member: dn, sAMAccountType: "wrong" }),
    false,
  );
  await assert.rejects(() =>
    verifyLdapCredentialsAsync(resources, { name: username, password: "disposable-user-password" }),
  );
  assert.equal(clientCount, 2);
  assert.deepEqual(
    await authorizeWithLdapCredentialsAsync(resources, { name: username, password: "disposable-user-password" }),
    { id: "new-directory-identity", name: username, groups: ["staff"] },
  );
  assert.equal(inserted.length, 1);
  assert.equal(identities[0]?.id, "same-email-local");
});

test("synthetic LDAP wrong-password denial closes both protocol clients without identity writes", async () => {
  const closed: number[] = [];
  let clientCount = 0;
  let identityWrites = 0;
  let searches = 0;
  const resources: LdapVerifierResources = {
    configuration,
    logger,
    createId: () => "unused-disposable-id",
    now: () => Date.parse("2026-10-10T12:00:00Z"),
    repository: {
      async findUserByEmail() {
        throw new Error("No identity read before password verification");
      },
      async insertUser() {
        identityWrites += 1;
      },
    },
    createClient() {
      const index = clientCount++;
      return new LdapClient({
        async bind() {
          if (index === 1) throw new Error("Injected incorrect LDAP password");
        },
        async search() {
          searches += 1;
          return {
            searchEntries: [{ dn: "cn=fixture-user,dc=example,dc=invalid", mail: "alice@example.invalid" }],
            searchReferences: [],
          };
        },
        async unbind() {
          closed.push(index);
        },
      });
    },
  };
  assert.equal(await verifyLdapCredentialsAsync(resources, { name: "alice", password: "wrong" }), null);
  assert.equal(identityWrites, 0);
  assert.equal(searches, 1);
  assert.deepEqual(closed.toSorted(), [0, 1]);
});

test("synthetic LDAP missing, ambiguous and invalid-mail identities deny before writes and close the service client", async () => {
  const entriesByCase: Entry[][] = [
    [],
    [
      { dn: "cn=first", mail: "first@example.invalid" },
      { dn: "cn=second", mail: "second@example.invalid" },
    ],
    [{ dn: "cn=invalid-mail", mail: "not-an-email" }],
  ];
  for (const entries of entriesByCase) {
    let created = 0;
    let closed = 0;
    const resources: LdapVerifierResources = {
      configuration,
      logger,
      createId: () => {
        throw new Error("No identity creation after directory denial");
      },
      now: () => Date.parse("2026-10-10T12:00:00Z"),
      repository: {
        async findUserByEmail() {
          throw new Error("No identity reads after directory denial");
        },
        async insertUser() {
          throw new Error("No identity writes after directory denial");
        },
      },
      createClient() {
        created += 1;
        return new LdapClient({
          async bind() {},
          async search() {
            return { searchEntries: entries, searchReferences: [] };
          },
          async unbind() {
            closed += 1;
          },
        });
      },
    };
    assert.equal(await verifyLdapCredentialsAsync(resources, { name: "alice", password: "disposable-password" }), null);
    assert.equal(created, 1);
    assert.equal(closed, 1);
  }
});
