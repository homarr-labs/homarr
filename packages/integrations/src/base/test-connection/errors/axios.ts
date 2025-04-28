import { AxiosError } from "axios";

import { reduceFetchError } from "@homarr/common";

import type { TestingResult } from "../test-connection-service";
import { TestConnectionError } from "../test-connection-service";

export const handleAxiosError = (error: unknown): TestingResult => {
  if (!(error instanceof AxiosError)) {
    throw error;
  }

  if (error.status !== undefined && error.response !== undefined) {
    return TestConnectionError.StatusResult({
      status: error.status,
      url: error.response.config.url ?? "?",
    });
  }

  if (error.code !== undefined) {
    const fetchError = reduceFetchError(error.code, error);
    if (fetchError) {
      throw fetchError;
    }
  }

  throw error;
};
