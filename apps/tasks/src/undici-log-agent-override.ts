import type { Dispatcher } from "undici";
import { Agent, setGlobalDispatcher } from "undici";

import { logger } from "@homarr/log";

class LoggingAgent extends Agent {
  constructor(...props: ConstructorParameters<typeof Agent>) {
    super(...props);
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandlers): boolean {
    const url = new URL(`${options.origin as string}${options.path}`);

    // The below code should prevent sensitive data from being logged as
    // some integrations use query parameters for auth
    url.searchParams.forEach((value, key) => {
      if (value === "") return; // Skip empty values
      if (/^\d{1,12}$/.test(value)) return; // Skip small numbers
      if (value === "true" || value === "false") return; // Skip boolean values
      if (/^[a-zA-Z]{1,12}$/.test(value)) return; // Skip short strings

      url.searchParams.set(key, "REDACTED");
    });

    logger.info(
      `Dispatching request ${url.toString().replaceAll("=&", "&")} (${Object.keys(options.headers as object).length} headers)`,
    );
    return super.dispatch(options, handler);
  }
}

const agent = new LoggingAgent();
setGlobalDispatcher(agent);
