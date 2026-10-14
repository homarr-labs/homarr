import { createLogger } from "@homarr/core/infrastructure/logs";
import type { ILogger } from "@homarr/core/infrastructure/logs";

import "@homarr/core/infrastructure/dns/init";

import { ResourceHttpAgent } from "./transport-agent";
import type { HttpAgentOptions as ResourceHttpAgentOptions } from "./transport-agent";

interface HttpAgentOptions extends Omit<ResourceHttpAgentOptions, "logger"> {
  logger?: ILogger;
}

export class UndiciHttpAgent extends ResourceHttpAgent {
  constructor(props?: HttpAgentOptions) {
    super({ ...props, logger: props?.logger ?? createLogger({ module: "httpAgent" }) });
  }
}
