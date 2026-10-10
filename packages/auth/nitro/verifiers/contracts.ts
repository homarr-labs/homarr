export interface AuthVerifierLogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface CredentialsIdentity {
  id: string;
  name: string | null;
  password: string | null;
}

export interface CredentialsIdentityRepository {
  findUserByName(selector: { name: string; provider: "credentials" }): Promise<CredentialsIdentity | null | undefined>;
}

export interface BasicVerifierResources {
  repository: CredentialsIdentityRepository;
  logger: AuthVerifierLogger;
}

export interface AuthorizedCredentialsIdentity {
  id: string;
  name: string | null;
}

export interface NewLdapIdentity {
  id: string;
  name: string;
  email: string;
  emailVerified: Date;
  image: null;
  provider: "ldap";
}

export interface LdapIdentityRepository {
  findUserByEmail(selector: { email: string; provider: "ldap" }): Promise<{ id: string } | null | undefined>;
  insertUser(user: NewLdapIdentity): Promise<void>;
}

export interface AuthorizedLdapIdentity {
  id: string;
  name: string;
  groups: string[];
}

export interface LdapConfiguration {
  bindDistinguishedName: string;
  bindPassword: string;
  base: string;
  searchScope: "base" | "one" | "sub";
  usernameAttribute: string;
  userMailAttribute: string;
  usernameFilterExtraArg?: string;
  groupClass: string;
  groupMemberAttribute: string;
  groupMemberUserAttribute: string;
  groupFilterExtraArg?: string;
}
