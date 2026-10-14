import { compare, hash } from "bcrypt";
import type { AdapterUser } from "@auth/core/adapters";

export const fixture = {
  origin: "https://auth-spike.invalid",
  basePath: "/api/auth",
  secret: "disposable-auth-spike-secret-not-for-production-2026-10-10",
  maxAge: 600,
  updateAge: 60,
  sessionCookie: "auth-spike.session-token",
  csrfCookie: "__Host-auth-spike.csrf-token",
  callbackCookie: "__Secure-auth-spike.callback-url",
  themeCookie: "auth-spike.theme",
  password: "Disposable-only-password-2026",
} as const;

export type FixtureIdentity = {
  user: AdapterUser;
  provider: "credentials" | "ldap";
  passwordHash: string;
};

export async function createIdentities(): Promise<FixtureIdentity[]> {
  const passwordHash = await hash(fixture.password, 10);
  return [
    {
      user: { id: "local-a", name: "alice", email: "alice@example.invalid", emailVerified: null },
      provider: "credentials",
      passwordHash,
    },
    {
      user: { id: "local-b", name: "bob", email: "bob@example.invalid", emailVerified: null },
      provider: "credentials",
      passwordHash,
    },
    {
      user: { id: "ldap-a", name: "directory-alice", email: "directory@example.invalid", emailVerified: null },
      provider: "ldap",
      passwordHash,
    },
  ];
}

export async function verifyLocal(identities: FixtureIdentity[], input: Partial<Record<string, unknown>>) {
  if (typeof input.name !== "string" || typeof input.password !== "string" || !input.name || !input.password)
    return null;
  const name = input.name.toLowerCase();
  const identity = identities.find((value) => value.provider === "credentials" && value.user.name === name);
  if (!identity || !(await compare(input.password, identity.passwordHash))) return null;
  return { ...identity.user };
}
