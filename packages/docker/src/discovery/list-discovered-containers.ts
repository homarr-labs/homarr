import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { DockerSingleton } from "../singleton";
import type { ParseContainerLabelsOptions } from "./parse-container-labels";
import { parseContainerLabels } from "./parse-container-labels";
import type { DockerDiscoveryHostResult, DockerDiscoveryResult } from "./types";

const logger = createLogger({ module: "dockerDiscovery" });
export const dockerDiscoveryHostTimeoutMs = 5_000;

const withTimeoutAsync = async <T>(promise: Promise<T>, timeoutMs: number, host: string) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Docker discovery timed out for ${host}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const reasonFromError = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Docker is not reachable";
};

export const listDiscoveredContainersAsync = async (
  options: ParseContainerLabelsOptions = {},
  timeoutMs = dockerDiscoveryHostTimeoutMs,
): Promise<DockerDiscoveryResult> => {
  const dockerInstances = DockerSingleton.getInstances();
  const settled = await Promise.allSettled(
    dockerInstances.map(async ({ instance, host }): Promise<DockerDiscoveryHostResult> => {
      const containers = await withTimeoutAsync(instance.listContainers({ all: false }), timeoutMs, host);
      const services = containers
        .map((container) => parseContainerLabels(container, host, options))
        .filter((service) => service !== null);
      return { host, status: "success", containers, services };
    }),
  );

  const hosts = settled.map<DockerDiscoveryHostResult>((result, index) => {
    const host = dockerInstances[index]?.host ?? "unknown";
    if (result.status === "fulfilled") return result.value;

    logger.warn(new ErrorWithMetadata("Failed to list containers for discovery", { host }, { cause: result.reason }));
    return {
      host,
      status: "unavailable",
      reason: reasonFromError(result.reason),
      containers: [],
      services: [],
    };
  });

  return {
    hosts,
    services: hosts.flatMap((result) => result.services),
  };
};
