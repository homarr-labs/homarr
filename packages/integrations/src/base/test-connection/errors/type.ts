import { AxiosError } from "axios";

import { reduceFetchError } from "@homarr/common";

import { ResponseError } from "../../error";
import type { TestingResult } from "../test-connection-service";

export interface IIntegrationErrorHandler {
  handleTestConnectionErrorAsync: (error: unknown) => Promise<TestingResult>;
  handleErrorAsync: (error: unknown) => Promise<void>;
}

class FetchIntegrationErrorHandler implements IIntegrationErrorHandler {
  /*public async handleTestConnectionErrorAsync(error: unknown): Promise<TestingResult> {
    
  }*/
  public async handleErrorAsync(error: unknown): Promise<void> {
    if (!this.isAxiosError(error)) {
      throw error;
    }

    if (error.response?.config.url !== undefined && error.status !== undefined) {
      throw new ResponseError({ status: error.status, url: error.response.config.url }, undefined);
    }

    if (error.code !== undefined) {
      const fetchError = reduceFetchError(error.code, error);
      if (fetchError) {
        throw fetchError; // Rename to requestError
      }
    }
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return error instanceof AxiosError;
  }
}
