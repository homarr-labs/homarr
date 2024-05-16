import type { Provider } from "next-auth/providers";

import { env } from "../env.mjs";

export const filterProviders = (
  providers: Exclude<Provider, () => unknown>[],
) => {
  const authProviders = env.AUTH_PROVIDERS ?? [];

  return providers.filter((provider) => {
    if (provider.id === "empty") {
      return true;
    }

    if (
      provider.id === "credentials" &&
      ["ldap", "credentials"].some((credentialType) =>
        authProviders.includes(credentialType),
      )
    ) {
      return true;
    }

    return authProviders.includes(provider.id);
  });
};
