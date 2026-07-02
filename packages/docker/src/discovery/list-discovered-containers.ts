import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { dockerLabels, homepageLabels } from "../labels";
import { DockerSingleton } from "../singleton";
import type { ParseContainerLabelsOptions } from "./parse-container-labels";
import { parseContainerLabels } from "./parse-container-labels";
import type { DiscoveredService } from "./types";

const logger = createLogger({ module: "dockerDiscovery" });

const hasDiscoveryLabels = (labels: Record<string, string>) =>
  Object.values(dockerLabels).some((label) => label !== dockerLabels.hide && label in labels) ||
  Object.values(homepageLabels).some((label) => label in labels);

export const listDiscoveredContainersAsync = async (
  options: ParseContainerLabelsOptions = {},
): Promise<DiscoveredService[]> => {
  const dockerInstances = DockerSingleton.getInstances();
  const results = await Promise.allSettled(
    dockerInstances.map(async ({ instance, host }) => {
      const containers = await instance.listContainers({ all: true });
      return containers
        .filter((container) => hasDiscoveryLabels(container.Labels ?? {}))
        .map((container) => parseContainerLabels(container, host, options))
        .filter((service): service is DiscoveredService => service !== null);
    }),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    logger.warn(
      new ErrorWithMetadata(
        "Failed to list containers for discovery",
        { host: dockerInstances[index]?.host },
        { cause: result.reason },
      ),
    );

    return [];
  });
};
