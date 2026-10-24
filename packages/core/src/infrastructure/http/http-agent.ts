import type { Dispatcher } from "undici";
import { EnvHttpProxyAgent } from "undici";

import type { ILogger } from "@homarr/core/infrastructure/logs";
import { createLogger } from "@homarr/core/infrastructure/logs";

// The below import statement initializes dns-caching
import "@homarr/core/infrastructure/dns/init";

export interface HttpAgentOptions extends EnvHttpProxyAgent.Options {
  logger?: ILogger;
  logOriginOnly?: boolean;
}

export class UndiciHttpAgent extends EnvHttpProxyAgent {
  private logger: ILogger;
  private logOriginOnly: boolean;

  constructor(props?: HttpAgentOptions) {
    super(props);
    this.logger = props?.logger ?? createLogger({ module: "httpAgent" });
    this.logOriginOnly = props?.logOriginOnly ?? false;
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler): boolean {
    this.logRequestDispatch(options);
    return super.dispatch(options, handler);
  }

  private logRequestDispatch(options: Dispatcher.DispatchOptions) {
    let loggedUrl = new URL(String(options.origin)).origin;
    if (!this.logOriginOnly) {
      const path = this.redactPathParams(options.path);
      const url = this.redactSearchParams(new URL(`${loggedUrl}${path}`));
      loggedUrl = url.toString().replaceAll("=&", "&");
    }

    this.logger.debug(`Dispatching request ${loggedUrl} (${Object.keys(options.headers ?? {}).length} headers)`);
  }

  /**
   * Redact path parameters that are longer than 32 characters
   * This is to prevent sensitive data from being logged
   * @param path path of the request
   * @returns redacted path
   */
  private redactPathParams(path: string): string {
    return path
      .split("/")
      .map((segment) => (segment.length >= 32 && !segment.startsWith("?") ? "REDACTED" : segment))
      .join("/");
  }

  /**
   * Redact sensitive search parameters from the URL.
   * It allows certain patterns to remain unredacted.
   * Like small numbers, booleans, short strings, dates, and date-times.
   * Some integrations use query parameters for auth.
   * @param url URL object of the request
   * @returns redacted URL object
   */
  private redactSearchParams(url: URL): URL {
    url.searchParams.forEach((value, key) => {
      if (value === "") return; // Skip empty values
      if (/^-?\d{1,12}$/.test(value)) return; // Skip small numbers
      if (value === "true" || value === "false") return; // Skip boolean values
      if (/^[a-zA-Z]{1,12}$/.test(value)) return; // Skip short strings
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return; // Skip dates
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return; // Skip date times

      url.searchParams.set(key, "REDACTED");
    });
    return url;
  }
}
