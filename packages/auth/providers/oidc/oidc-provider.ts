import type { OIDCConfig } from "next-auth/providers";

import { env } from "../../env.mjs";
import { createRedirectUri } from "../../redirect";

interface Profile {
  sub: string;
  name: string;
  email: string;
  groups: string[];
  preferred_username: string;
  email_verified: boolean;
}

export const OidcProvider = (): OIDCConfig<Profile> => ({
  id: "oidc",
  name: env.AUTH_OIDC_CLIENT_NAME,
  type: "oidc",
  clientId: env.AUTH_OIDC_CLIENT_ID,
  clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
  issuer: env.AUTH_OIDC_ISSUER,
  authorization: {
    params: {
      scope: env.AUTH_OIDC_SCOPE_OVERWRITE,
      redirect_uri: createRedirectUri("/api/auth/callback/oidc"),
    },
  },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.preferred_username,
      email: profile.email,
    };
  },
});
