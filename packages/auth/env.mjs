import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const supportedAuthProviders = ["credentials", "oidc", "ldap"];
const authProvidersSchema = z
  .string()
  .min(1)
  .transform((providers) =>
    providers
      .replaceAll(" ", "")
      .toLowerCase()
      .split(",")
      .filter((provider) => {
        if (supportedAuthProviders.includes(provider)) return provider;
        else if (!provider)
          console.log(
            `One or more of the entries for AUTH_PROVIDER could not be parsed and/or returned null.`,
          );
        else
          console.log(
            `The value entered for AUTH_PROVIDER "${provider}" is incorrect.`,
          );
      }),
  )
  .default(["credentials"]);

const authProviders = authProvidersSchema.parse(process.env.AUTH_PROVIDERS);

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    AUTH_PROVIDERS: authProvidersSchema,
    ...(authProviders.includes("oidc")
      ? {
          AUTH_OIDC_ISSUER: z.string().min(1),
          AUTH_OIDC_CLIENT_ID: z.string().min(1),
          AUTH_OIDC_CLIENT_SECRET: z.string().min(1),
          AUTH_OIDC_CLIENT_NAME: z.string().min(1).default("OpenID Connect"),
          AUTH_OIDC_SCOPE_OVERWRITE: z.string().min(1).optional(),
        }
      : {}),
    ...(authProviders.includes("ldap")
      ? {
          AUTH_LDAP_URI: z.string().url(),
          AUTH_LDAP_BIND_DN: z.string(),
          AUTH_LDAP_BIND_PASSWORD: z.string(),
          AUTH_LDAP_BASE: z.string(),
          AUTH_LDAP_SEARCH_SCOPE: z
            .enum(["base", "one", "sub"])
            .default("base"),
          AUTH_LDAP_USERNAME_ATTRIBUTE: z.string().default("uid"),
          AUTH_LDAP_USER_MAIL_ATTRIBUTE: z.string().default("mail"),
          AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG: z.string().optional(),
          AUTH_LDAP_GROUP_CLASS: z.string().default("groupOfUniqueNames"),
          AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE: z.string().default("member"),
          AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE: z.string().default("dn"),
          AUTH_LDAP_GROUP_FILTER_EXTRA_ARG: z.string().optional(),
        }
      : {}),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
  },
  skipValidation:
    Boolean(process.env.CI) || Boolean(process.env.SKIP_ENV_VALIDATION),
});
