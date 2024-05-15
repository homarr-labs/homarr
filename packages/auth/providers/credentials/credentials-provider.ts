import type Credentials from "@auth/core/providers/credentials";

import { db } from "@homarr/db";
import { validation } from "@homarr/validation";

import { adapter } from "../../adapter";
import { authorizeWithBasicCredentials } from "./authorization/basic-authorization";
import { authorizeWithLdapCredentials } from "./authorization/ldap-authorization";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const credentialsConfiguration = {
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
  async authorize(credentials) {
    const data = await validation.user.signIn.parseAsync(credentials);

    if (data.credentialType === "ldap") {
      return await authorizeWithLdapCredentials(adapter, data);
    }

    return await authorizeWithBasicCredentials(db, data);
  },
} satisfies CredentialsConfiguration;
