import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import type { OIDCConfig } from "@auth/core/providers";
import type { Profile } from "@auth/core/types";

import { env } from "../../env.mjs";
import { createRedirectUri } from "../../redirect";

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
    if (!profile.sub) {
      throw new Error(`OIDC provider did not return a sub property='${Object.keys(profile).join(",")}'`);
    }
    const name = extractProfileName(profile);
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

export const extractProfileName = (profile: Profile) => {
  if (!env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE) {
    // Use the name as the username if the preferred_username is an email address
    return profile.preferred_username?.includes("@") ? profile.name : profile.preferred_username;
  }

  return profile[env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE as keyof typeof profile] as string;
};
