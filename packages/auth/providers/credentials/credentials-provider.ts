import type Credentials from "@auth/core/providers/credentials";

import type { Database } from "@homarr/db";
import { validation } from "@homarr/validation";

import { authorizeWithBasicCredentialsAsync } from "./authorization/basic-authorization";
import { authorizeWithLdapCredentialsAsync } from "./authorization/ldap-authorization";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const createCredentialsConfiguration = (db: Database) =>
  ({
    type: "credentials",
    name: "Credentials",
    credentials: {
      name: {
        label: "Username",
        type: "text",
      },
      password: {
        label: "Password",
        type: "password",
      },
      isLdap: {
        label: "LDAP",
        type: "checkbox",
      },
    },
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials) {
      const data = await validation.user.signIn.parseAsync(credentials);

      if (data.credentialType === "ldap") {
        return await authorizeWithLdapCredentialsAsync(db, data).catch(() => null);
      }

      return await authorizeWithBasicCredentialsAsync(db, data);
    },
  }) satisfies CredentialsConfiguration;
