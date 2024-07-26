import type { SupportedAuthProvider } from "@homarr/definitions";

import { env } from "../env.mjs";

export const isProviderEnabled = (provider: SupportedAuthProvider) => {
  return env.AUTH_PROVIDERS.includes(provider);
};
