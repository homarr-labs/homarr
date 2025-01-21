import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { createBooleanSchema, createDurationSchema, shouldSkipEnvValidation } from "@homarr/common/env-validation";
import { supportedAuthProviders } from "@homarr/definitions";

const authProvidersSchema = z
  .string()
  .min(1)
  .transform((providers) =>
    providers
      .replaceAll(" ", "")
      .toLowerCase()
      .split(",")
      .filter((provider) => {
        if (supportedAuthProviders.some((supportedProvider) => supportedProvider === provider)) return true;
        else if (!provider)
          console.log("One or more of the entries for AUTH_PROVIDER could not be parsed and/or returned null.");
        else console.log(`The value entered for AUTH_PROVIDER "${provider}" is incorrect.`);
        return false;
      }),
  )
  .default("credentials");

const skipValidation = shouldSkipEnvValidation();
const authProviders = skipValidation ? [] : authProvidersSchema.parse(process.env.AUTH_PROVIDERS);

export const env = createEnv({
  server: {
    AUTH_LOGOUT_REDIRECT_URL: z.string().url().optional(),
    AUTH_SESSION_EXPIRY_TIME: createDurationSchema("30d"),
    AUTH_PROVIDERS: authProvidersSchema,
    ...(authProviders.includes("oidc")
      ? {
          AUTH_OIDC_ISSUER: z.string().url(),
          AUTH_OIDC_CLIENT_ID: z.string().min(1),
          AUTH_OIDC_CLIENT_SECRET: z.string().min(1),
          AUTH_OIDC_CLIENT_NAME: z.string().min(1).default("OIDC"),
          AUTH_OIDC_AUTO_LOGIN: createBooleanSchema(false),
          AUTH_OIDC_SCOPE_OVERWRITE: z.string().min(1).default("openid email profile groups"),
          AUTH_OIDC_GROUPS_ATTRIBUTE: z.string().default("groups"), // Is used in the signIn event to assign the correct groups, key is from object of decoded id_token
          AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE: z.string().optional(),
        }
      : {}),
    ...(authProviders.includes("ldap")
      ? {
          AUTH_LDAP_URI: z.string().url(),
          AUTH_LDAP_BIND_DN: z.string(),
          AUTH_LDAP_BIND_PASSWORD: z.string(),
          AUTH_LDAP_BASE: z.string(),
          AUTH_LDAP_SEARCH_SCOPE: z.enum(["base", "one", "sub"]).default("base"),
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
    AUTH_LOGOUT_REDIRECT_URL: process.env.AUTH_LOGOUT_REDIRECT_URL,
    AUTH_SESSION_EXPIRY_TIME: process.env.AUTH_SESSION_EXPIRY_TIME,
    AUTH_PROVIDERS: process.env.AUTH_PROVIDERS,
    AUTH_LDAP_BASE: process.env.AUTH_LDAP_BASE,
    AUTH_LDAP_BIND_DN: process.env.AUTH_LDAP_BIND_DN,
    AUTH_LDAP_BIND_PASSWORD: process.env.AUTH_LDAP_BIND_PASSWORD,
    AUTH_LDAP_GROUP_CLASS: process.env.AUTH_LDAP_GROUP_CLASS,
    AUTH_LDAP_GROUP_FILTER_EXTRA_ARG: process.env.AUTH_LDAP_GROUP_FILTER_EXTRA_ARG,
    AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE: process.env.AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE,
    AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE: process.env.AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE,
    AUTH_LDAP_SEARCH_SCOPE: process.env.AUTH_LDAP_SEARCH_SCOPE,
    AUTH_LDAP_URI: process.env.AUTH_LDAP_URI,
    AUTH_OIDC_CLIENT_ID: process.env.AUTH_OIDC_CLIENT_ID,
    AUTH_OIDC_CLIENT_NAME: process.env.AUTH_OIDC_CLIENT_NAME,
    AUTH_OIDC_CLIENT_SECRET: process.env.AUTH_OIDC_CLIENT_SECRET,
    AUTH_OIDC_ISSUER: process.env.AUTH_OIDC_ISSUER,
    AUTH_OIDC_SCOPE_OVERWRITE: process.env.AUTH_OIDC_SCOPE_OVERWRITE,
    AUTH_OIDC_GROUPS_ATTRIBUTE: process.env.AUTH_OIDC_GROUPS_ATTRIBUTE,
    AUTH_LDAP_USERNAME_ATTRIBUTE: process.env.AUTH_LDAP_USERNAME_ATTRIBUTE,
    AUTH_LDAP_USER_MAIL_ATTRIBUTE: process.env.AUTH_LDAP_USER_MAIL_ATTRIBUTE,
    AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG: process.env.AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG,
    AUTH_OIDC_AUTO_LOGIN: process.env.AUTH_OIDC_AUTO_LOGIN,
    AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE: process.env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE,
  },
  skipValidation,
  emptyStringAsUndefined: true,
});
