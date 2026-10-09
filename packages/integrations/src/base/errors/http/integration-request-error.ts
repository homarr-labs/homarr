import type { AnyRequestError, RequestError, RequestErrorType } from "@homarr/common/server";

import type { IntegrationErrorData } from "../integration-error";
import { IntegrationError } from "../integration-error";

export type IntegrationRequestErrorOfType<TType extends RequestErrorType> = IntegrationRequestError & {
  cause: RequestError<TType>;
};

export class IntegrationRequestError extends IntegrationError {
  /**
   * URL of the endpoint the failed request was sent to. Defaults to the integration URL. Integrations that also talk
   * to a secondary endpoint (for example a separate indexer URL) set it, so that test connection inspects and offers
   * to trust the certificate of the endpoint that actually failed.
   */
  public readonly requestUrl: string;

  constructor(integration: IntegrationErrorData, { cause, url }: { cause: AnyRequestError; url?: string }) {
    super(integration, "Request to integration failed", { cause });
    this.name = IntegrationRequestError.name;
    this.requestUrl = url ?? integration.url;
  }

  get cause(): AnyRequestError {
    return super.cause as AnyRequestError;
  }
}
