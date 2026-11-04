import { Client, FilterParser, InvalidCredentialsError } from "ldapts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const userDn = "uid=alice,ou=people,dc=example,dc=com";
const userPassword = "fixture-user-password";
const directoryCredentials = new Map<string, string>();
const request = new Request("http://localhost");

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("CI", undefined);
  vi.stubEnv("SKIP_ENV_VALIDATION", undefined);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_PROVIDERS", "ldap");
  vi.stubEnv("AUTH_LDAP_URI", "ldap://127.0.0.1:389");
  vi.stubEnv("AUTH_LDAP_BASE", "dc=example,dc=com");
  vi.stubEnv("AUTH_LDAP_BIND_DN", undefined);
  vi.stubEnv("AUTH_LDAP_BIND_PASSWORD", undefined);
  vi.stubEnv("AUTH_LDAP_SEARCH_SCOPE", "sub");
  vi.stubEnv("AUTH_LDAP_USERNAME_ATTRIBUTE", "uid");
  vi.stubEnv("AUTH_LDAP_USER_MAIL_ATTRIBUTE", "mail");
  vi.stubEnv("AUTH_LDAP_GROUP_CLASS", "groupOfUniqueNames");
  vi.stubEnv("AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE", "member");
  vi.stubEnv("AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE", "dn");
  vi.stubEnv("AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG", undefined);
  vi.stubEnv("AUTH_LDAP_GROUP_FILTER_EXTRA_ARG", undefined);
  directoryCredentials.clear();
  directoryCredentials.set("", "");
  directoryCredentials.set(userDn, userPassword);

  const boundClients = new WeakSet<Client>();
  vi.spyOn(Client.prototype, "bind").mockImplementation(async function (this: Client, dn, password) {
    if (typeof dn !== "string" || !directoryCredentials.has(dn) || directoryCredentials.get(dn) !== password) {
      throw new InvalidCredentialsError();
    }
    boundClients.add(this);
  });
  vi.spyOn(Client.prototype, "search").mockImplementation(async function (this: Client, _base, options = {}) {
    if (!boundClients.has(this)) throw new InvalidCredentialsError();
    const filter = FilterParser.parseString(String(options.filter));
    const entries: ({ dn: string } & Record<string, string>)[] = [
      { dn: userDn, uid: "alice", mail: "alice@example.com", objectClass: "person" },
      {
        dn: "cn=homarr-users,ou=groups,dc=example,dc=com",
        cn: "homarr-users",
        objectClass: "groupOfUniqueNames",
        member: userDn,
      },
    ];
    return { searchEntries: entries.filter((entry) => filter.matches(entry)), searchReferences: [] };
  });
  vi.spyOn(Client.prototype, "unbind").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test("signs in through anonymous directory lookup when environment validation is skipped", async () => {
  vi.stubEnv("SKIP_ENV_VALIDATION", "true");
  const { createDb } = await import("@homarr/db/test");
  const { createLdapConfiguration } = await import("../credentials/credentials-provider");
  const provider = createLdapConfiguration(createDb());

  const user = await provider.authorize({ name: "alice", password: userPassword }, request);

  expect(user).toMatchObject({ name: "alice", groups: ["homarr-users"] });
});

test.each([undefined, ""])(
  "signs in through anonymous directory lookup with absent or empty credentials: %s",
  async (value) => {
    vi.stubEnv("AUTH_LDAP_BIND_DN", value);
    vi.stubEnv("AUTH_LDAP_BIND_PASSWORD", value);
    const { createDb } = await import("@homarr/db/test");
    const { createLdapConfiguration } = await import("../credentials/credentials-provider");
    const provider = createLdapConfiguration(createDb());

    const user = await provider.authorize({ name: "alice", password: userPassword }, request);

    expect(user).toMatchObject({ name: "alice", groups: ["homarr-users"] });
  },
);

test("still signs in when directory searches require configured service credentials", async () => {
  const serviceDn = "uid=service,ou=people,dc=example,dc=com";
  const servicePassword = "fixture-service-password";
  vi.stubEnv("AUTH_LDAP_BIND_DN", serviceDn);
  vi.stubEnv("AUTH_LDAP_BIND_PASSWORD", servicePassword);
  directoryCredentials.delete("");
  directoryCredentials.set(serviceDn, servicePassword);
  const { createDb } = await import("@homarr/db/test");
  const { createLdapConfiguration } = await import("../credentials/credentials-provider");
  const provider = createLdapConfiguration(createDb());

  const user = await provider.authorize({ name: "alice", password: userPassword }, request);

  expect(user).toMatchObject({ name: "alice", groups: ["homarr-users"] });
});

test("rejects an incorrect user password after anonymous directory lookup", async () => {
  const { createDb } = await import("@homarr/db/test");
  const { createLdapConfiguration } = await import("../credentials/credentials-provider");
  const provider = createLdapConfiguration(createDb());

  await expect(provider.authorize({ name: "alice", password: "incorrect" }, request)).resolves.toBeNull();
});

test("rejects an empty user password when the directory allows anonymous lookup", async () => {
  const { createDb } = await import("@homarr/db/test");
  const { createLdapConfiguration } = await import("../credentials/credentials-provider");
  const provider = createLdapConfiguration(createDb());

  await expect(provider.authorize({ name: "alice", password: "" }, request)).rejects.toThrow();
});
