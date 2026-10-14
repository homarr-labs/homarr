import type { Dispatcher } from "undici";
import { EnvHttpProxyAgent } from "undici/index.js";

export interface HttpTransportLogger {
  debug: (message: string) => void;
}

export interface HttpAgentOptions extends EnvHttpProxyAgent.Options {
  logger?: HttpTransportLogger;
}

export class ResourceHttpAgent extends EnvHttpProxyAgent {
  private readonly logger: HttpTransportLogger | undefined;

  constructor(props: HttpAgentOptions) {
    super(props);
    this.logger = props.logger;
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler): boolean {
    if (this.logger) {
      const path = options.path
        .split("/")
        .map((segment) => (segment.length >= 32 && !segment.startsWith("?") ? "REDACTED" : segment))
        .join("/");
      const url = new URL(`${String(options.origin)}${path}`);
      url.searchParams.forEach((value, key) => {
        if (value === "") return;
        if (/^-?\d{1,12}$/.test(value)) return;
        if (value === "true" || value === "false") return;
        if (/^[a-zA-Z]{1,12}$/.test(value)) return;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return;
        url.searchParams.set(key, "REDACTED");
      });
      this.logger.debug(
        `Dispatching request ${url.toString().replaceAll("=&", "&")} (${Object.keys(options.headers ?? {}).length} headers)`,
      );
    }
    return super.dispatch(options, handler);
  }
}
