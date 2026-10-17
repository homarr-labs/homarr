import type { X509Certificate } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

import { getPortFromUrl } from "@homarr/common";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationRequestErrorOfType } from "../errors/http/integration-request-error";
import { IntegrationRequestError } from "../errors/http/integration-request-error";
import { IntegrationError } from "../errors/integration-error";
import type { AnyTestConnectionError } from "./test-connection-error";
import { TestConnectionError } from "./test-connection-error";

const logger = createLogger({
  module: "testConnectionService",
});

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
    logger.debug("Testing connection", {
      url: this.url.toString(),
    });

    const testingResult = await testingCallbackAsync({
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

    if (testingResult.success) {
      logger.debug("Testing connection succeeded", {
        url: this.url.toString(),
      });

      return testingResult;
    }

    logger.debug("Testing connection failed", {
      url: this.url.toString(),
      error: `${testingResult.error.name}: ${testingResult.error.message}`,
    });

    if (!(testingResult.error instanceof IntegrationRequestError)) {
      return testingResult.error.toResult();
    }

    // The failing request may target a secondary endpoint (for example a separate indexer URL), so the
    // certificate has to be read from the URL of that request and not from the integration URL.
    const certificateUrl = this.getCertificateUrl(testingResult.error);
    const certificate = await this.fetchCertificateAsync(certificateUrl).catch((error: unknown) => {
      logger.debug("Fetching certificate failed", {
        url: certificateUrl.toString(),
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
      return undefined;
    });
    if (!certificate) {
      return TestConnectionError.UnknownResult(new Error("Unable to fetch certificate"));
    }

    return TestConnectionError.CertificateResult(testingResult.error.cause, certificate, certificateUrl.toString());
  }

  private getCertificateUrl(error: IntegrationRequestErrorOfType<"certificate">): URL {
    try {
      return new URL(error.requestUrl);
    } catch {
      return this.url;
    }
  }

  private async fetchCertificateAsync(url: URL): Promise<X509Certificate | undefined> {
    logger.debug("Fetching certificate", {
      url: url.toString(),
    });

    // URL.hostname keeps the brackets of IPv6 literals, tls.connect expects the bare address.
    const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
    const port = getPortFromUrl(url);
    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      try {
        const innerSocket = tls.connect(
          {
            host,
            // SNI must not be an IP address (RFC 6066)
            ...(net.isIP(host) === 0 ? { servername: host } : {}),
            port,
            rejectUnauthorized: false,
          },
          () => {
            resolve(innerSocket);
          },
        );
        innerSocket.once("error", (error) => {
          reject(new Error("Unable to fetch certificate", { cause: error }));
        });
      } catch (error) {
        reject(new Error("Unable to fetch certificate", { cause: error }));
      }
    });

    const x509 = socket.getPeerX509Certificate();
    socket.destroy();

    logger.debug("Fetched certificate", {
      url: url.toString(),
      subject: x509?.subject,
      issuer: x509?.issuer,
    });
    return x509;
  }
}
