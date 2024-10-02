import type Credentials from "@auth/core/providers/credentials";

import type { Database } from "@homarr/db";
import { validation } from "@homarr/validation";

import { authorizeWithBasicCredentialsAsync } from "./authorization/basic-authorization";
import { authorizeWithLdapCredentialsAsync } from "./authorization/ldap-authorization";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const createCredentialsConfiguration = (db: Database) =>
  ({
    id: "credentials",
    type: "credentials",
    name: "Credentials",
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials) {
      const data = await validation.user.signIn.parseAsync(credentials);

      return await authorizeWithBasicCredentialsAsync(db, data);
    },
  }) satisfies CredentialsConfiguration;

export const createLdapConfiguration = (db: Database) =>
  ({
    id: "ldap",
    type: "credentials",
    name: "Ldap",
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials) {
      const data = await validation.user.signIn.parseAsync(credentials);
      return await authorizeWithLdapCredentialsAsync(db, data).catch(() => null);
    },
  }) satisfies CredentialsConfiguration;
