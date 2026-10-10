import { CredentialsSignin } from "@auth/core/errors";
import { EqualityFilter } from "ldapts";
import type { z } from "zod/v4";

import { utf8EmailSchema } from "@homarr/validation/email";
import { ldapSignInSchema } from "@homarr/validation/user";

import type {
  AuthVerifierLogger,
  AuthorizedLdapIdentity,
  LdapConfiguration,
  LdapIdentityRepository,
  NewLdapIdentity,
} from "./contracts";
import type { LdapProtocol } from "./ldap-client";

export interface LdapVerifierResources {
  configuration: LdapConfiguration;
  repository: LdapIdentityRepository;
  logger: AuthVerifierLogger;
  createClient(): LdapProtocol;
  createId(): string;
  now(): number;
}

export const authorizeWithLdapCredentialsAsync = async (
  { configuration, repository, logger, createClient, createId, now }: LdapVerifierResources,
  credentials: z.infer<typeof ldapSignInSchema>,
): Promise<AuthorizedLdapIdentity> => {
  const openClients = new Set<LdapProtocol>();
  const openClient = () => {
    const client = createClient();
    openClients.add(client);
    return client;
  };
  const disconnectClient = async (client: LdapProtocol) => {
    openClients.delete(client);
    await client.disconnectAsync();
  };
  try {
    logger.info("User is trying to log in using LDAP. Connecting to LDAP server...", { userName: credentials.name });
    const client = openClient();
    await client
      .bindAsync({ distinguishedName: configuration.bindDistinguishedName, password: configuration.bindPassword })
      .catch((error: unknown) => {
        throw new CredentialsSignin("Failed to connect to LDAP server", { cause: error });
      });

    logger.info("Connected to LDAP server. Searching for user...");

    const ldapUser = await client
      .searchAsync({
        base: configuration.base,
        options: {
          filter: createLdapUserFilter(configuration, credentials.name),
          scope: configuration.searchScope,
          attributes: [
            ...new Set([
              configuration.usernameAttribute,
              configuration.userMailAttribute,
              configuration.groupMemberUserAttribute,
            ]),
          ],
        },
      })
      .then((entries) => {
        if (entries.length > 1) {
          logger.warn(`Multiple LDAP users found for ${credentials.name}, expected only one.`);
          throw new CredentialsSignin();
        }
        return entries.at(0);
      });

    if (!ldapUser) throw new CredentialsSignin(`User not found in LDAP username="${credentials.name}"`);

    const mailResult = await utf8EmailSchema.safeParseAsync(ldapUser[configuration.userMailAttribute]);
    if (!mailResult.success) {
      logger.error("User found in LDAP but with invalid or non-existing Email", {
        userName: credentials.name,
        emailValue: ldapUser[configuration.userMailAttribute],
      });
      throw new CredentialsSignin("User found in LDAP but with invalid or non-existing Email");
    }

    logger.info("User found in LDAP. Logging in...", { userName: credentials.name });

    const userClient = openClient();
    await userClient.bindAsync({ distinguishedName: ldapUser.dn, password: credentials.password }).catch(() => {
      logger.warn("Wrong credentials for user", { userName: credentials.name });
      throw new CredentialsSignin();
    });
    await disconnectClient(userClient);

    logger.info("User credentials are correct. Retrieving user groups...", { userName: credentials.name });

    const groupClassFilter = new EqualityFilter({ attribute: "objectClass", value: configuration.groupClass });
    const groupMemberFilter = new EqualityFilter({
      attribute: configuration.groupMemberAttribute,
      value: ldapUser[configuration.groupMemberUserAttribute],
    });
    const userGroups = await client
      .searchAsync({
        base: configuration.base,
        options: {
          filter: `(&${groupClassFilter.toString()}${groupMemberFilter.toString()}${configuration.groupFilterExtraArg ?? ""})`,
          scope: configuration.searchScope,
          attributes: ["cn"],
        },
      })
      .then((entries) => entries.map((entry) => entry.cn).filter((group): group is string => group !== undefined));

    logger.info("User groups retrieved", { userName: credentials.name, groups: userGroups.length });
    await disconnectClient(client);

    let user = await repository.findUserByEmail({ email: mailResult.data, provider: "ldap" });
    if (!user) {
      logger.info("User not found in the database. Creating...", { userName: credentials.name });
      const insertUser = {
        id: createId(),
        name: credentials.name,
        email: mailResult.data,
        emailVerified: new Date(now()),
        image: null,
        provider: "ldap",
      } satisfies NewLdapIdentity;
      await repository.insertUser(insertUser);
      user = insertUser;
      logger.info("User created successfully", { userName: credentials.name });
    }

    return { id: user.id, name: credentials.name, groups: userGroups };
  } finally {
    for (const client of [...openClients].toReversed()) {
      await disconnectClient(client).catch(() => {
        logger.warn("Failed to disconnect LDAP client");
      });
    }
  }
};

export const createLdapUserFilter = (configuration: LdapConfiguration, username: string) => {
  const userFilter = new EqualityFilter({ attribute: configuration.usernameAttribute, value: username }).toString();
  return configuration.usernameFilterExtraArg ? `(&${userFilter}${configuration.usernameFilterExtraArg})` : userFilter;
};

export const verifyLdapCredentialsAsync = async (resources: LdapVerifierResources, input: unknown) => {
  const credentials = await ldapSignInSchema.parseAsync(input);
  return authorizeWithLdapCredentialsAsync(resources, credentials).catch(() => null);
};
