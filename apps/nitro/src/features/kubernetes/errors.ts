import { ORPCError } from "@orpc/client";

export type KubernetesErrorKind = "authentication" | "permission" | "unavailable" | "input" | "internal";

const errorMessages: Record<KubernetesErrorKind, string> = {
  authentication: "Sign in again to read Kubernetes resources.",
  permission: "Administrator permission is required to read Kubernetes resources.",
  unavailable: "Kubernetes or the selected context is not available. Check the configured contexts.",
  input: "The Kubernetes context selection could not be accepted. Select a configured context.",
  internal: "Kubernetes data could not be loaded. Check server logs for details.",
};

export class KubernetesReadError extends Error {
  constructor(readonly kind: KubernetesErrorKind) {
    super(errorMessages[kind]);
    this.name = "KubernetesReadError";
  }
}

export function toKubernetesReadError(error: unknown): KubernetesReadError {
  if (error instanceof KubernetesReadError) return error;
  if (error instanceof ORPCError) {
    if (error.code === "UNAUTHORIZED") return new KubernetesReadError("authentication");
    if (error.code === "FORBIDDEN") return new KubernetesReadError("permission");
    if (error.code === "NOT_FOUND") return new KubernetesReadError("unavailable");
    if (error.code === "BAD_REQUEST") return new KubernetesReadError("input");
  }
  return new KubernetesReadError("internal");
}

export async function readKubernetesAsync<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    throw toKubernetesReadError(error);
  }
}
