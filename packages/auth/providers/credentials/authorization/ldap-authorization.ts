import { CredentialsSignin } from "@auth/core/errors";

import type { Database, InferInsertModel } from "@homarr/db";
import { and, createId, eq, inArray } from "@homarr/db";
import { groupMembers, groups, users } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { validation } from "@homarr/validation";
import { z } from "@homarr/validation";

import { env } from "../../../env.mjs";
import { LdapClient } from "../ldap-client";

export const authorizeWithLdapCredentialsAsync = async (
  db: Database,
  credentials: z.infer<typeof validation.user.signIn>,
) => {
  logger.info(`user ${credentials.name} is trying to log in using LDAP. Connecting to LDAP server...`);
  const client = new LdapClient();
  await client
    .bindAsync({
      distinguishedName: env.AUTH_LDAP_BIND_DN,
      password: env.AUTH_LDAP_BIND_PASSWORD,
    })
    .catch(() => {
      logger.error("Failed to connect to LDAP server");
      throw new CredentialsSignin();
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
    logger.warn(`User ${credentials.name} not found in LDAP`);
    throw new CredentialsSignin();
  }

  // Validate email
  const mailResult = await z.string().email().safeParseAsync(ldapUser[env.AUTH_LDAP_USER_MAIL_ATTRIBUTE]);

  if (!mailResult.success) {
    logger.error(
      `User ${credentials.name} found but with invalid or non-existing Email. Not Supported: "${ldapUser[env.AUTH_LDAP_USER_MAIL_ATTRIBUTE]}"`,
    );
    throw new CredentialsSignin();
  }

  logger.info(`User ${credentials.name} found in LDAP. Logging in...`);

  // Bind with user credentials to check if the password is correct
  const userClient = new LdapClient();
  await userClient
    .bindAsync({
      distinguishedName: ldapUser.dn,
      password: credentials.password,
    })
    .catch(() => {
      logger.warn(`Wrong credentials for user ${credentials.name}`);
      throw new CredentialsSignin();
    });
  await userClient.disconnectAsync();

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
        attributes: ["cn"],
      },
    })
    .then((entries) => entries.map((entry) => entry.cn).filter((group): group is string => group !== undefined));

  logger.info(`Found ${userGroups.length} groups for user ${credentials.name}.`);

  await client.disconnectAsync();

  // Create or update user in the database
  let user = await db.query.users.findFirst({
    columns: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      provider: true,
    },
    with: {
      groups: {
        with: {
          group: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    where: and(eq(users.email, mailResult.data), eq(users.provider, "ldap")),
  });

  if (!user) {
    logger.info(`User ${credentials.name} not found in the database. Creating...`);

    const insertUser = {
      id: createId(),
      name: credentials.name,
      email: mailResult.data,
      emailVerified: new Date(), // assume email is verified
      image: null,
      provider: "ldap",
    } satisfies InferInsertModel<typeof users>;

    await db.insert(users).values(insertUser);

    user = {
      ...insertUser,
      groups: [],
    };

    logger.info(`User ${credentials.name} created successfully.`);
  }

  if (user.name !== credentials.name) {
    logger.warn(`User ${credentials.name} found in the database but with different name. Updating...`);

    user.name = credentials.name;

    await db.update(users).set({ name: user.name }).where(eq(users.id, user.id));

    logger.info(`User ${credentials.name} updated successfully.`);
  }

  const ldapGroupsUserIsNotIn = userGroups.filter(
    (group) => !user.groups.some((userGroup) => userGroup.group.name === group),
  );

  if (ldapGroupsUserIsNotIn.length > 0) {
    logger.debug(
      `Homarr does not have the user in certain groups. user=${user.name} count=${ldapGroupsUserIsNotIn.length}`,
    );

    const groupIds = await db.query.groups.findMany({
      columns: {
        id: true,
      },
      where: inArray(groups.name, ldapGroupsUserIsNotIn),
    });

    logger.debug(`Homarr has found groups in the database user is not in. user=${user.name} count=${groupIds.length}`);

    if (groupIds.length > 0) {
      await db.insert(groupMembers).values(
        groupIds.map((group) => ({
          userId: user.id,
          groupId: group.id,
        })),
      );

      logger.info(`Added user to groups successfully. user=${user.name} count=${groupIds.length}`);
    } else {
      logger.debug(`User is already in all groups of Homarr. user=${user.name}`);
    }
  }

  const homarrGroupsUserIsNotIn = user.groups.filter((userGroup) => !userGroups.includes(userGroup.group.name));

  if (homarrGroupsUserIsNotIn.length > 0) {
    logger.debug(
      `Homarr has the user in certain groups that LDAP does not have. user=${user.name} count=${homarrGroupsUserIsNotIn.length}`,
    );

    await db.delete(groupMembers).where(
      and(
        eq(groupMembers.userId, user.id),
        inArray(
          groupMembers.groupId,
          homarrGroupsUserIsNotIn.map(({ groupId }) => groupId),
        ),
      ),
    );

    logger.info(`Removed user from groups successfully. user=${user.name} count=${homarrGroupsUserIsNotIn.length}`);
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
