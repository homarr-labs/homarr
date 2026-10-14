import type { X509Certificate } from "node:crypto";
import type tls from "node:tls";

import type { IntegrationRequestErrorOfType } from "../errors/http/integration-request-error";
import { IntegrationRequestError } from "../errors/http/integration-request-error";
import { IntegrationError } from "../errors/integration-error";
import type { AnyTestConnectionError } from "./test-connection-error";
import { TestConnectionError } from "./test-connection-error";

export type TestingResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: AnyTestConnectionError;
    };
type AsyncTestingCallback = (input: {
  ca: string[] | string;
  checkServerIdentity: typeof tls.checkServerIdentity;
}) => Promise<TestingResult>;

export interface TestConnectionResources {
  getTlsOptionsAsync: () => Promise<Parameters<AsyncTestingCallback>[0]>;
  fetchCertificateAsync: (url: URL) => Promise<X509Certificate | undefined>;
}

export class TestConnectionService {
  constructor(
    private url: URL,
    private resources: TestConnectionResources,
  ) {}

  public async handleAsync(testingCallbackAsync: AsyncTestingCallback) {
    const testingResult = await testingCallbackAsync(await this.resources.getTlsOptionsAsync())
      .then((result) => {
        if (result.success) return result;

        const error = result.error;
        if (error instanceof TestConnectionError) return error.toResult();

        return TestConnectionError.UnknownResult(error);
      })
      .catch((error: unknown) => {
        if (!(error instanceof IntegrationError)) {
          return TestConnectionError.UnknownResult(error);
        }

        if (!(error instanceof IntegrationRequestError)) {
          return TestConnectionError.FromIntegrationError(error).toResult();
        }

        if (error.cause.type !== "certificate") {
          return TestConnectionError.FromIntegrationError(error).toResult();
        }

        return {
          success: false,
          error: error as IntegrationRequestErrorOfType<"certificate">,
        } as const;
      });

    if (testingResult.success) {
      return testingResult;
    }

    if (!(testingResult.error instanceof IntegrationRequestError)) {
      return testingResult.error.toResult();
    }

    const certificate = await this.resources.fetchCertificateAsync(this.url);
    if (!certificate) {
      return TestConnectionError.UnknownResult(new Error("Unable to fetch certificate"));
    }

    return TestConnectionError.CertificateResult(testingResult.error.cause, certificate);
  }
}
