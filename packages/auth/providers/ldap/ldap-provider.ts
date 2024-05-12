import Credentials from "@auth/core/providers/credentials";

import { logger } from "@homarr/log";
import { validation } from "@homarr/validation";

import { createLdapClient } from "./client";

export const LdapProvider = () =>
  Credentials({
    id: "ldap",
    name: "LDAP",
    credentials: {
      username: {
        label: "Username",
        type: "text",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    async authorize(credentials) {
      const data = await validation.user.signIn.parseAsync(credentials);

      logger.info(
        `user ${data.name} is trying to log in using LDAP. Connecting to LDAP server...`,
      );
      const client = await createLdapClient();
      logger.info("Connected to LDAP server. Searching for user...");

      const ldapUser = await searchLdapUser;
    },
  });
