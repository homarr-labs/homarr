import { IntegrationTestConnectionError } from "../base/test-connection-error";

export const throwByUnifiControllerResponseStatusCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      throw new IntegrationTestConnectionError("badRequest");
    case 401:
      throw new IntegrationTestConnectionError("unauthorized");
    case 403:
      throw new IntegrationTestConnectionError("forbidden");
    case 404:
      throw new IntegrationTestConnectionError("notFound");
    case 429:
      throw new IntegrationTestConnectionError("tooManyRequests");
    case 500:
      throw new IntegrationTestConnectionError("internalServerError");
    case 503:
      throw new IntegrationTestConnectionError("serviceUnavailable");
    default:
      throw new IntegrationTestConnectionError("commonError");
  }
};
