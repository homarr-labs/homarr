import { ApiError } from "../../procedure";

import { env } from "@homarr/auth/env";

export const throwIfCredentialsDisabled = () => {
  if (!env.AUTH_PROVIDERS.includes("credentials")) {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Credentials provider is disabled",
    });
  }
};
