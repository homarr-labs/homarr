import type { Provider } from "next-auth/providers";

import { env } from "../env.mjs";

export const filterProviders = (
  providers: Exclude<Provider, () => unknown>[],
) => {
  return providers.filter((provider) => {
    if (provider.id === "empty") {
      return true;
    }

    if (
      provider.id === "credentials" &&
      ["ldap", "credentials"].some((credentialType) =>
        env.AUTH_PROVIDERS.includes(credentialType),
      )
    ) {
      return true;
    }

    return env.AUTH_PROVIDERS.includes(provider.id);
  });
};
