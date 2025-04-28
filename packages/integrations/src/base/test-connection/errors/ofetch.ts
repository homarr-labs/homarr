import { FetchError } from "ofetch";

import type { TestingResult } from "../test-connection-service";
import { TestConnectionError } from "../test-connection-service";

/**
 * Ofetch is for example used within the ctrl packages like qbittorrent, deluge, transmission, etc.
 */
export const handleOfetchError = (error: unknown): TestingResult => {
  if (!(error instanceof FetchError)) {
    throw error;
  }

  if (error.status !== undefined && error.response !== undefined) {
    return TestConnectionError.StatusResult({
      status: error.status,
      url: error.response.url,
    });
  }

  if (error.cause instanceof TypeError) {
    throw error.cause;
  }

  throw error;
};
