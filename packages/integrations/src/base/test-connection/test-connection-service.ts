import type { X509Certificate } from "node:crypto";
import tls from "node:tls";

import {
  createCustomCheckServerIdentity,
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/certificates/server";
import { getPortFromUrl } from "@homarr/common";

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

export class TestConnectionService {
  constructor(private url: URL) {}

  public async handleAsync(testingCallbackAsync: AsyncTestingCallback) {
    const firstResult = await testingCallbackAsync({
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    })
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

    if (firstResult.success) {
      return firstResult;
    }

    if (!(firstResult.error instanceof IntegrationRequestError)) {
      return firstResult.error.toResult();
    }

    return await this.handleCertificateErrorAsync(testingCallbackAsync, firstResult.error);
  }

  private async handleCertificateErrorAsync(
    testingCallbackAsync: AsyncTestingCallback,
    requestError: IntegrationRequestErrorOfType<"certificate">,
  ): Promise<
    | {
        success: true;
      }
    | {
        success: false;
        error: AnyTestConnectionError;
      }
  > {
    const certificate = await this.fetchCertificateAsync();
    if (!certificate) {
      return TestConnectionError.UnknownResult(new Error("Unable to fetch certificate"));
    }

    return TestConnectionError.CertificateResult(requestError.cause, certificate);
  }

  private async fetchCertificateAsync(): Promise<X509Certificate | undefined> {
    const url = this.url;
    const port = getPortFromUrl(url);
    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      try {
        const innerSocket = tls.connect(
          {
            host: url.hostname,
            servername: url.hostname,
            port,
            rejectUnauthorized: false,
          },
          () => {
            resolve(innerSocket);
          },
        );
      } catch (error) {
        reject(new Error("Unable to fetch certificate", { cause: error }));
      }
    });

    const x509 = socket.getPeerX509Certificate();
    socket.destroy();
    return x509;
  }
}
