import type { Provider } from "next-auth/providers";

import { env } from "../env.mjs";

export const filterProviders = (
  providers: Exclude<Provider, () => unknown>[],
) => {
  return providers.filter(
    (provider) =>
      provider.id === "empty" || env.AUTH_PROVIDERS.includes(provider.id),
  );
};
