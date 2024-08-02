import type { Dispatcher } from "undici";
import { Agent, setGlobalDispatcher } from "undici";

import { logger } from "@homarr/log";

class LoggingAgent extends Agent {
  constructor(...props: ConstructorParameters<typeof Agent>) {
    super(...props);
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandlers): boolean {
    logger.info(
      `Dispatching request ${options.method} ${options.origin as string}${options.path} (${Object.keys(options.headers as object).length} headers)`,
    );
    return super.dispatch(options, handler);
  }
}

const agent = new LoggingAgent();
setGlobalDispatcher(agent);
