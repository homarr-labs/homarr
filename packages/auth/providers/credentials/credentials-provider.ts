import type Credentials from "@auth/core/providers/credentials";

import { resolveRequestIdentity } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { ldapSignInSchema, userSignInSchema } from "@homarr/validation/user";

import { authorizeWithBasicCredentialsAsync } from "./authorization/basic-authorization";
import { authorizeWithLdapCredentialsAsync } from "./authorization/ldap-authorization";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const createCredentialsConfiguration = (db: Database) =>
  ({
    id: "credentials",
    type: "credentials",
    name: "Credentials",
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials, request) {
      const data = await userSignInSchema.parseAsync(credentials);
      const ipAddress = resolveRequestIdentity(request.headers).address ?? "unknown";

      return await authorizeWithBasicCredentialsAsync(db, data, ipAddress);
    },
  }) satisfies CredentialsConfiguration;

export const createLdapConfiguration = (db: Database) =>
  ({
    id: "ldap",
    type: "credentials",
    name: "Ldap",
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials, request) {
      const data = await ldapSignInSchema.parseAsync(credentials);
      const ipAddress = resolveRequestIdentity(request.headers).address ?? "unknown";
      return await authorizeWithLdapCredentialsAsync(db, data, ipAddress).catch(() => null);
    },
  }) satisfies CredentialsConfiguration;
