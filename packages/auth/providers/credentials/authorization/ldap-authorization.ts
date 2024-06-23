import type { Adapter } from "@auth/core/adapters";

import { createId } from "@homarr/db";
import { logger } from "@homarr/log";
import type { validation } from "@homarr/validation";
import { z } from "@homarr/validation";

import { env } from "../../../env.mjs";
import { LdapClient } from "../ldap-client";

export const authorizeWithLdapCredentialsAsync = async (
  adapter: Adapter,
  credentials: z.infer<typeof validation.user.signIn>,
) => {
  logger.info(`user ${credentials.name} is trying to log in using LDAP. Connecting to LDAP server...`);
  const client = new LdapClient();
  await client.bindAsync({
    distinguishedName: env.AUTH_LDAP_BIND_DN,
    password: env.AUTH_LDAP_BIND_PASSWORD,
  });
  logger.info("Connected to LDAP server. Searching for user...");

  const ldapUser = await client
    .searchAsync({
      base: env.AUTH_LDAP_BASE,
      options: {
        filter: createLdapUserFilter(credentials.name),
        scope: env.AUTH_LDAP_SEARCH_SCOPE,
        attributes: [env.AUTH_LDAP_USERNAME_ATTRIBUTE, env.AUTH_LDAP_USER_MAIL_ATTRIBUTE],
      },
    })
    .then((entries) => entries.at(0));

  if (!ldapUser) {
    throw new Error(`User ${credentials.name} not found in LDAP`);
  }

  // Validate email
  const mailResult = await z.string().email().safeParseAsync(ldapUser[env.AUTH_LDAP_USER_MAIL_ATTRIBUTE]);

  if (!mailResult.success) {
    throw new Error(
      `User found but with invalid or non-existing Email. Not Supported: "${
        ldapUser[env.AUTH_LDAP_USER_MAIL_ATTRIBUTE] ?? " "
      }"`,
    );
  }

  logger.info(`User ${credentials.name} found in LDAP. Logging in...`);

  // Bind with user credentials to check if the password is correct
  const userClient = new LdapClient();
  await userClient.bindAsync({
    distinguishedName: ldapUser.dn,
    password: credentials.password,
  });
  userClient.disconnect();

  logger.info(`User ${credentials.name} logged in successfully, retrieving user groups...`);

  const userGroups = await client
    .searchAsync({
      base: env.AUTH_LDAP_BASE,
      options: {
        // For example, if the user is doejohn, the filter will be (&(objectClass=group)(uid=doejohn)) or (&(objectClass=group)(uid=doejohn)(sAMAccountType=1234))
        filter: `(&(objectClass=${env.AUTH_LDAP_GROUP_CLASS})(${
          env.AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE
        }=${ldapUser[env.AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE]})${env.AUTH_LDAP_GROUP_FILTER_EXTRA_ARG ?? ""})`,
        scope: env.AUTH_LDAP_SEARCH_SCOPE,
        attributes: "cn",
      },
    })
    .then((entries) => entries.map((entry) => entry.cn).filter((group): group is string => group !== undefined));

  logger.info(`Found ${userGroups.length} groups for user ${credentials.name}.`);

  client.disconnect();

  // Create or update user in the database
  let user = await adapter.getUserByEmail?.(mailResult.data);

  if (!user) {
    logger.info(`User ${credentials.name} not found in the database. Creating...`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    user = await adapter.createUser!({
      id: createId(),
      name: credentials.name,
      email: mailResult.data,
      emailVerified: new Date(), // assume email is verified
    });

    logger.info(`User ${credentials.name} created successfully.`);
  }

  if (user.name !== credentials.name) {
    logger.warn(`User ${credentials.name} found in the database but with different name. Updating...`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    user = await adapter.updateUser!({
      id: user.id,
      name: credentials.name,
    });

    logger.info(`User ${credentials.name} updated successfully.`);
  }

  return {
    id: user.id,
    name: user.name,
  };
};

const createLdapUserFilter = (username: string) => {
  if (env.AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG) {
    // For example, if the username is doejohn and the extra arg is (sAMAccountType=1234), the filter will be (&(uid=doejohn)(sAMAccountType=1234))
    return `(&(${env.AUTH_LDAP_USERNAME_ATTRIBUTE}=${username})${env.AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG})`;
  }

  // For example, if the username is doejohn, the filter will be (uid=doejohn)
  return `(${env.AUTH_LDAP_USERNAME_ATTRIBUTE}=${username})`;
};
