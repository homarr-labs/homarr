import { AxiosHttpErrorHandler, FetchHttpErrorHandler, OFetchHttpErrorHandler } from "@homarr/common";

import { IntegrationHttpErrorHandler } from "./integration-http-error-handler";

export const integrationFetchHttpErrorHandler = new IntegrationHttpErrorHandler(new FetchHttpErrorHandler());
export const integrationOFetchHttpErrorHandler = new IntegrationHttpErrorHandler(new OFetchHttpErrorHandler());
export const integrationAxiosHttpErrorHandler = new IntegrationHttpErrorHandler(new AxiosHttpErrorHandler());
