import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { DockerSingleton } from "../singleton";
import type { ParseContainerLabelsOptions } from "./parse-container-labels";
import { parseContainerLabels } from "./parse-container-labels";
import type { DockerDiscoveryHostResult, DockerDiscoveryResult } from "./types";

const logger = createLogger({ module: "dockerDiscovery" });
export const dockerDiscoveryHostTimeoutMs = 5_000;

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
      const controller = new AbortController();
      const timeoutError = new Error(`Docker discovery timed out for ${host}`);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const containers = await Promise.race([
          instance.listContainers({ all: false, abortSignal: controller.signal }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort(timeoutError);
              reject(timeoutError);
            }, timeoutMs);
          }),
        ]);
        const services = containers
          .map((container) => parseContainerLabels(container, host, options))
          .filter((service) => service !== null);
        return { host, status: "success", containers, services };
      } catch (error) {
        if (controller.signal.aborted) throw timeoutError;
        throw error;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
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
