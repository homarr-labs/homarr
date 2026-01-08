import type { SupportedAuthProvider } from "@homarr/definitions";

import { env } from "../env";

export const isProviderEnabled = (provider: SupportedAuthProvider) => {
  // The question mark is placed there because isProviderEnabled is called during static build of about page

  return env.AUTH_PROVIDERS?.includes(provider);
};
