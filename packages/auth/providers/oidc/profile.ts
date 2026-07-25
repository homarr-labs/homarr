import type { Profile } from "@auth/core/types";

import { env } from "../../env";

export const getProfileValueByPath = (profile: Profile, path: string): unknown => {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, key)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, profile);
};

export const extractProfileName = (profile: Profile): string | undefined => {
  if (!env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE) {
    // Use the name as the username if the preferred_username is an email address
    return (profile.preferred_username?.includes("@") ? profile.name : profile.preferred_username) ?? undefined;
  }

  const profileName = getProfileValueByPath(profile, env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE);
  return typeof profileName === "string" ? profileName : undefined;
};
