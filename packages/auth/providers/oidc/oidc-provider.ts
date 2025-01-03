import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import type { OIDCConfig } from "next-auth/providers";

import { env } from "../../env.mjs";
import { createRedirectUri } from "../../redirect";

interface Profile {
  sub: string;
  name: string;
  email: string;
  groups: string[];
  preferred_username?: string;
  email_verified: boolean;
}

export const OidcProvider = (headers: ReadonlyHeaders | null): OIDCConfig<Profile> => ({
  id: "oidc",
  name: env.AUTH_OIDC_CLIENT_NAME,
  type: "oidc",
  clientId: env.AUTH_OIDC_CLIENT_ID,
  clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
  issuer: env.AUTH_OIDC_ISSUER,
  authorization: {
    params: {
      scope: env.AUTH_OIDC_SCOPE_OVERWRITE,
      // We fallback to https as generally oidc providers require https
      redirect_uri: createRedirectUri(headers, "/api/auth/callback/oidc", "https"),
    },
  },
  profile(profile) {
    const name = extractName(profile);
    if (!name) {
      throw new Error(`OIDC provider did not return a name properties='${Object.keys(profile).join(",")}'`);
    }

    return {
      id: profile.sub,
      name,
      email: profile.email,
      provider: "oidc",
    };
  },
});

const extractName = (profile: Profile) => {
  if (!env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE) {
    // Use the name as the username if the preferred_username is an email address
    return profile.preferred_username?.includes("@") ? profile.name : profile.preferred_username;
  }

  return profile[env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE as keyof typeof profile] as string;
};
