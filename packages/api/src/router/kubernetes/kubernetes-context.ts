import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { KubernetesClient, KubernetesContextNotFoundError } from "./kubernetes-client";

export const kubernetesContextInput = z.object({ contextId: z.string().min(1) });

export const getKubernetesClient = (contextId: string) => {
  try {
    return KubernetesClient.getInstance(contextId);
  } catch (error) {
    if (error instanceof KubernetesContextNotFoundError) {
      throw new ApiError({ code: "NOT_FOUND", message: error.message });
    }
    throw error;
  }
};
